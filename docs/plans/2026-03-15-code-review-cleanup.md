# Code Review Cleanup — Design & Implementation Plan

**Date**: 2026-03-15
**Prereq**: `docs/code-review-issues.md` (full issue list with research notes)
**Branch**: `fix/code-review-cleanup` (current)

---

## Overview

15 issues found during pre-submission code review. Fixes are grouped into 4 phases by dependency. Phases 3-4 are independent of each other and of phases 1-2.

## Phase 1: Purchase Flow Rearchitecture

**Issues**: #1 (server-side investor keys), #3 (hardcoded wallet restriction), #7 (fake UI delay)

### Current Flow
1. Frontend: identity check (readContract) → compliance check (readContract)
2. Frontend: POST `/api/purchase` with `{ investorAddress, amount }`
3. Backend: loads investor private key from env → signs eUSD HTS transfer via Hedera SDK → mints CPC via viem
4. Frontend: shows 500ms fake delay between "eUSD payment" and "bond tokens issued"

### New Flow
1. Frontend: identity check (readContract) → compliance check (readContract)
2. Frontend: `eUSD.approve(deployerAddress, amount)` via wagmi writeContract — investor signs in MetaMask
3. Frontend: POST `/api/purchase` with `{ investorAddress, amount, message, signature }` (auth from Phase 2)
4. Backend: verifies signature → `eUSD.transferFrom(investor, treasury, amount)` via viem → `cpcToken.mint(investor, amount)` via viem
5. Frontend: each step is a real operation — no fake delays

### Key Details

- eUSD EVM address: `0x00000000000000000000000000000000007D5999` (long-zero of HTS 0.0.8214937)
- Standard ERC-20 ABI for approve/transferFrom (no custom ABI needed)
- Gas: approve ~100k, transferFrom ~250k
- Demo wallets already associated with eUSD (done in hts-setup.ts)
- Deployer must be the spender in approve() — msg.sender verification in HTS precompile

### Files Changed
- `frontend/components/transfer-flow.tsx` — add approve step, remove fake delay
- `frontend/app/api/purchase/route.ts` — rewrite: remove buildWalletKeys/Hedera SDK, use viem transferFrom
- `frontend/lib/constants.ts` — add eUSD EVM address constant
- `frontend/.env` — remove ALICE_PRIVATE_KEY, ALICE_ACCOUNT_ID, DIANA_PRIVATE_KEY, DIANA_ACCOUNT_ID
- `frontend/.env.local.example` — same removals
- Vercel env vars — remove same 4 vars

### Tests
- Update E2E purchase tests (wallet-mock needs to handle approve tx)
- Update `frontend/__tests__/api/purchase.test.ts` unit tests for new flow
- Manual testnet verification: approve + purchase with Alice wallet

---

## Phase 2: API Authentication

**Issues**: #2 (no auth on API routes), #8 (allocate API open), #14 (unused API_KEY)

### Approach: EIP-191 Wallet Signature Verification

Frontend signs a message with wagmi `signMessage()`, backend verifies with viem `verifyMessage()`.

### New Auth Helper
```typescript
// frontend/lib/auth.ts
// signAuthMessage(config, address, purpose) → { message, signature }
// verifyAuth(message, signature, expectedAddress) → verified address or throws
```

### Route Changes
- `/api/purchase`: require signature, verify signer === investorAddress
- `/api/allocate`: require signature, verify signer === DEPLOYER_ADDRESS env var
- Both: reject signatures older than 60 seconds

### Files Changed
- `frontend/lib/auth.ts` — new file: signAuthMessage (client) + verifyAuth (server)
- `frontend/app/api/purchase/route.ts` — add auth check at top of POST handler
- `frontend/app/api/allocate/route.ts` — add auth check, verify issuer
- `frontend/components/transfer-flow.tsx` — call signAuthMessage before API call
- `frontend/app/issue/page.tsx` — call signAuthMessage before allocate API call
- Root `.env` — remove API_KEY line
- `frontend/.env.local.example` — remove API_KEY line, add DEPLOYER_ADDRESS

### Tests
- Unit test for verifyAuth helper (valid sig, expired sig, wrong address)
- Update purchase/allocate API tests to include signatures
- E2E: wallet-mock already signs messages — verify purchase still works

---

## Phase 3: Data Integrity Fixes

**Issues**: #4, #5, #10, #11 — all independent

### 3a. Country restriction from contract (#4)

Replace hardcoded `RESTRICTED_COUNTRIES = [156]` with on-chain call:
```typescript
const isRestricted = await publicClient.readContract({
  address: COUNTRY_RESTRICT_MODULE_ADDRESS,
  abi: countryRestrictModuleAbi,
  functionName: "isCountryRestricted",
  args: [CONTRACT_ADDRESSES.compliance, country],
});
```

**Files**: `frontend/components/compliance-status.tsx`, `frontend/lib/constants.ts` (add module address)

### 3b. HCS pagination (#5)

Initial load: paginate via `links.next` until null. Polls: use `sequencenumber=gt:lastSeq`.

**Files**: `frontend/hooks/use-hcs-audit.ts`

### 3c. Mirror Node retry (#10)

Add retry helper with 3 attempts, exponential backoff (500ms, 1s, 2s). Apply to:
- `frontend/app/api/purchase/route.ts` getEusdBalance()
- `frontend/hooks/use-hts.ts` getEusdBalance()

**Files**: `frontend/lib/retry.ts` (new), purchase route, use-hts hook

### 3d. Topic ID validation (#11)

Show "HCS topic not configured" warning in UI when topic ID is empty instead of silently returning empty state.

**Files**: `frontend/hooks/use-hcs-audit.ts`, `frontend/components/audit-event-feed.tsx`

---

## Phase 4: Minor Fixes

**Issues**: #6, #9, #13, #15 — all independent

### 4a. HCS message overflow (#6)

Add payload size check in `/api/allocate` before submitting to HCS. Return 400 error if projected message > 1KB.

**Files**: `frontend/app/api/allocate/route.ts`

### 4b. Contract address duplication (#9)

Document in README that `@coppice/abi` baked-in addresses are source of truth. Env vars are overrides for non-standard deployments. No code change.

**Files**: `README.md`

### 4c. Refund error message (#13)

Track whether refund succeeded and return accurate error message to client.

**Files**: `frontend/app/api/purchase/route.ts`

### 4d. Event logger retry (#15)

Add 3-attempt retry for failed HCS submissions in event logger.

**Files**: `middleware/src/event-logger.ts`

---

## Implementation Order

Steps are numbered for sequential execution. Steps within the same phase that are marked "parallel" can be done simultaneously.

1. **Phase 1**: Purchase flow rearchitecture
   - 1.1 Add eUSD EVM address constant
   - 1.2 Rewrite purchase API route (remove Hedera SDK, use viem transferFrom)
   - 1.3 Update transfer-flow component (add approve step, remove fake delay)
   - 1.4 Update purchase unit tests
   - 1.5 Update E2E purchase tests
   - 1.6 Remove investor env vars from frontend/.env, .env.local.example
   - 1.7 Remove investor env vars from Vercel

2. **Phase 2**: API authentication
   - 2.1 Create auth helper (signAuthMessage + verifyAuth)
   - 2.2 Add auth to purchase route
   - 2.3 Add auth to allocate route
   - 2.4 Update transfer-flow to sign before purchase
   - 2.5 Update issuer dashboard to sign before allocate
   - 2.6 Remove API_KEY from .env files, add DEPLOYER_ADDRESS
   - 2.7 Unit tests for auth helper
   - 2.8 Update API route unit tests

3. **Phase 3**: Data integrity (all parallel)
   - 3a. Country restriction from contract
   - 3b. HCS pagination
   - 3c. Mirror Node retry
   - 3d. Topic ID validation

4. **Phase 4**: Minor fixes (all parallel)
   - 4a. HCS message overflow check
   - 4b. README documentation
   - 4c. Refund error message
   - 4d. Event logger retry

5. **Verification**
   - 5.1 `npm run lint` + `npm run build` + `npm run test:unit` from root
   - 5.2 E2E tests pass
   - 5.3 Manual testnet verification on Vercel deployment
   - 5.4 Update CLAUDE.md / README.md if needed

---

## Not Fixing

- **#12** (BOND_DETAILS hardcoded): Coupon rate and maturity don't exist as fields in ERC-3643 token contracts. The standard only stores name/symbol/decimals/totalSupply. Bond-specific terms are off-chain data (prospectus, term sheet). Hardcoding is the only option without deploying a new contract or HCS message type. Acceptable for demo.
