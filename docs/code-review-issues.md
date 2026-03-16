# Code Review Issues — Pre-Submission Audit

Tracked issues found during codebase review (March 15, 2026).
Research notes included so any issue can be picked up without re-investigation.

---

## Critical

### 1. Server-side custody of demo wallet private keys
- **Files**: `frontend/app/api/purchase/route.ts:20-47, 109-121`
- **Issue**: Purchase API holds Alice/Diana private keys server-side to sign eUSD HTS transfers via the Hedera SDK `TransferTransaction`. This means only wallets whose keys are loaded server-side can purchase — currently Alice, Diana, and Deployer.
- **Root cause**: Original assumption was that HTS token transfers require the Hedera SDK. This is wrong — HTS tokens expose a full ERC-20 facade via HIP-218 (live since Hedera services v0.24).
- **Fix**: Move eUSD transfer client-side using ERC-20 `approve()`/`transferFrom()` pattern. Keep only `DEPLOYER_PRIVATE_KEY` server-side for minting (agent-only operation).
- **Cleanup after fix**: Remove `ALICE_PRIVATE_KEY`, `ALICE_ACCOUNT_ID`, `DIANA_PRIVATE_KEY`, `DIANA_ACCOUNT_ID` from Vercel env vars, `frontend/.env`, and `frontend/.env.local.example`.

#### Research: HTS ERC-20 Facade

**eUSD EVM address**: HTS token `0.0.8214937` → extract number `8214937` → hex `0x7D5999` → pad to 20 bytes → `0x00000000000000000000000000000000007D5999`. This "long-zero" address is the EVM facade contract. Verified via Mirror Node (no `evm_address` field returned, but the long-zero format is standardized per HIP-218).

**Works for SDK-created tokens**: eUSD was created via Hedera SDK in `scripts/hts-setup.ts`, NOT via a smart contract. Per HIP-218 and HIP-376, the ERC-20 facade applies to ALL HTS tokens regardless of how they were created. Confirmed: `balanceOf`, `transfer`, `approve`, `transferFrom` all work on SDK-created tokens.

**Available ERC-20 functions** (all work on the facade):
- `transfer(address, uint256)`, `approve(address, uint256)`, `transferFrom(address, address, uint256)`
- `balanceOf(address)`, `allowance(address, address)`, `name()`, `symbol()`, `decimals()`, `totalSupply()`
- HTS-specific extensions (HIP-719): `associate()`, `dissociate()`, `isAssociated(address)`

**IMPORTANT — transferFrom authorization model**: HTS has stricter auth than standard ERC-20. Per Hedera docs: "ERC20 transferFrom functions work with msg.sender and that is the account that will be verified in the context of a precompile." This means:
- The investor must `approve(deployerAddress, amount)` first
- The deployer EOA can then call `transferFrom(investor, treasury, amount)` because msg.sender (deployer) matches the approved spender
- This works because the deployer is the spender in the allowance, and msg.sender in the EVM context is the deployer

**Token association**: Accounts need association before receiving HTS tokens. Options:
- Auto-association: Accounts with `maxAutoAssociations = -1` (default for new accounts) auto-associate. Demo wallets were created via `hts-setup.ts` which explicitly associates them, so they're already associated.
- Manual via facade: Call `token.associate()` with gasLimit 800,000 — this IS possible from MetaMask.
- For the demo wallets, association is already done. For arbitrary new wallets, we'd need to handle this in the UI.

**Recommended purchase flow (post-fix)**:
1. Frontend: investor calls `eUSD.approve(deployerAddress, amount)` via wagmi `writeContract` (gasLimit ~100k)
2. Frontend: POST to `/api/purchase` with `{ investorAddress, amount, signature }`
3. Backend: calls `eUSD.transferFrom(investor, treasury, amount)` using deployer key via viem (gasLimit ~250k) — works because deployer is the approved spender
4. Backend: calls `cpcToken.mint(investor, amount)` using deployer key via viem

**Gas limits for HTS precompile calls**:
| Operation | Gas |
|-----------|-----|
| `transfer()` / `transferFrom()` | 200k-300k |
| `approve()` | 60k-100k |
| `balanceOf()` (read) | 5k-10k |
| `associate()` | 800k |

**Sources**: HIP-218, HIP-336, HIP-376, HIP-719, HIP-904

### 2. No authentication on write API routes
- **Files**: `frontend/app/api/purchase/route.ts`, `frontend/app/api/issuer/allocate/route.ts`
- **Issue**: No auth on either endpoint. `API_KEY=coppice-demo-key` is defined in `.env` but never checked. Issuer dashboard checks `isAgent` client-side only — the API itself is wide open. Anyone can mint tokens or write fake impact data to HCS.

#### Research: Auth Approach

**Recommended: EIP-191 wallet signature verification** (best balance of security vs. hackathon simplicity)

**Verified**: `personal_sign` (EIP-191) works on Hedera testnet via MetaMask + Hashio JSON-RPC relay. viem's `verifyMessage()` is purely cryptographic — no RPC call needed, works server-side without chain access.

Frontend (wagmi v3):
```typescript
import { signMessage } from "@wagmi/core";
// wagmi v3 API: signMessage(config, { account?, message, connector? })
const timestamp = new Date().toISOString();
const nonce = Math.random().toString(36).slice(2, 10);
const message = `Coppice - ${purpose}\nAddress: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
const signature = await signMessage(wagmiConfig, { account: address, message });
// Send { message, signature, address } with API call
```

Backend:
```typescript
import { verifyMessage } from "viem";

// Verify caller owns the wallet — pure crypto, no RPC needed
const isValid = await verifyMessage({
  address: claimedAddress as `0x${string}`,
  message,
  signature: signature as `0x${string}`,
});
// Reject if !isValid or timestamp > 60s old
```

For `/api/purchase`: verify `signerAddress === investorAddress` (proves caller is the investor).
For `/api/issuer/allocate`: verify `signerAddress === process.env.DEPLOYER_ADDRESS` (proves caller is the issuer).

**Rejected alternatives**:
- Simple API key: doesn't prove wallet ownership, key visible in frontend code
- SIWE: overkill for hackathon, requires session management + JWT + nonce storage

### 3. Purchase restricted to hardcoded demo wallets
- **Files**: `frontend/app/api/purchase/route.ts:84-87`
- **Issue**: Only Alice, Diana, and Deployer can purchase because only their keys are in `buildWalletKeys()`. Any other wallet gets "Unknown wallet — only demo wallets are supported." This is the live Vercel deployment behavior, not just an E2E limitation.
- **Fix**: Resolves automatically when #1 is fixed — client-side eUSD transfers eliminate the wallet map entirely. The API route only needs to do `transferFrom()` + `mint()`, both using the deployer key.

---

## Moderate

### 4. Hardcoded country restriction in UI doesn't match contract
- **Files**: `frontend/components/compliance-status.tsx:63-64`
- **Issue**: Jurisdiction check (check #3 of 4) uses hardcoded `RESTRICTED_COUNTRIES = [156]` and an incomplete country name map `{ 276: "Germany", 250: "France", 156: "China", 840: "United States" }`. If countries are added/removed on-chain via CountryRestrictModule, the UI shows stale data.
- **Mitigating factor**: Check #4 (`canTransfer()` on ModularCompliance) DOES hit the actual contract, so a restricted user would still see "Transfer blocked by compliance" — the UI just wouldn't explain that the jurisdiction is the reason.

#### Research: CountryRestrictModule on-chain query

The contract has `isCountryRestricted(address _compliance, uint16 _country) → bool` (public view, line 222-225 of CountryRestrictModule.sol). There is **no** `getRestrictedCountries()` — the mapping is private. You must know the country code to check.

**ABI is already generated**: `countryRestrictModuleAbi` is exported from `@coppice/common` (configured in `packages/common/wagmi.config.ts` line 18).

**Deployed address**: `0xfeafC271237D5fbe90dC285df5AeD0bF901F3755`

- **Fix (recommended)**: Replace the hardcoded `RESTRICTED_COUNTRIES` array with an on-chain call. Since we already have the investor's country from `getCountry()`, call `isCountryRestricted(complianceAddress, country)` on the CountryRestrictModule to check if their specific country is restricted. This is a single `readContract` call per compliance check.
  ```typescript
  const isRestricted = await publicClient.readContract({
    address: "0xfeafC271237D5fbe90dC285df5AeD0bF901F3755",
    abi: countryRestrictModuleAbi,
    functionName: "isCountryRestricted",
    args: [CONTRACT_ADDRESSES.compliance, country],
  });
  ```
- **Country name map**: Keep the hardcoded name map (cosmetic only) or use a library like `i18n-iso-countries`. Not worth an on-chain solution.

### 5. HCS audit feed capped at 100 messages, no pagination
- **Files**: `frontend/hooks/use-hcs-audit.ts:32`
- **Issue**: Mirror Node query: `limit=100` with no pagination. Once topic exceeds 100 messages, older events are invisible. The poll (every 5s) uses `lastSequenceRef` to avoid duplicates on subsequent fetches, but the initial fetch only gets the first 100.

#### Research: Mirror Node pagination

**Verified API format** (tested against `https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.8214934/messages?order=asc&limit=5`):

Response includes a `links.next` field for cursor-based pagination:
```json
{
  "messages": [...],
  "links": {
    "next": "/api/v1/topics/0.0.8214934/messages?order=asc&limit=5&timestamp=gt:1773510982.344915458"
  }
}
```

- `limit` max is **100** (default 25). Cannot go higher.
- Supports `timestamp=gt:X` (cursor from `links.next`) and `sequencenumber=gt:X` (alternative).
- `links.next` is `null` when no more messages.

**Fix pattern**:
```typescript
// Initial load: paginate through all messages
let nextUrl = `/api/v1/topics/${topicId}/messages?order=asc&limit=100`;
while (nextUrl) {
  const res = await fetch(`${MIRROR_NODE_URL}${nextUrl}`);
  const data = await res.json();
  allMessages.push(...(data.messages || []));
  nextUrl = data.links?.next || null;
}

// Subsequent polls: only new messages
const url = `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?order=asc&limit=100&sequencenumber=gt:${lastSequenceRef.current}`;
```

### 6. Silent HCS message drop on size overflow
- **Files**: `services/src/event-logger.ts:55-57`
- **Issue**: Messages >1KB silently skipped with `console.warn`. In practice, audit events are ~200 bytes so this won't fire for normal operations. Could affect `/api/issuer/allocate` if someone enters a very long project name.
- **Fix**: Either chunk messages (HCS supports multi-part), or truncate the payload, or return an error from `/api/issuer/allocate` if the payload would exceed 1KB.

### 7. Transfer-flow UI has fake 500ms delay
- **Files**: `frontend/components/transfer-flow.tsx:84`
- **Issue**: After `/api/purchase` returns (does both eUSD + CPC in one request), a `setTimeout(r, 500)` fakes the appearance of two sequential on-chain steps. Steps 1-2 (identity check, compliance check) are real `readContract` calls. Steps 3-4 (eUSD payment, token issuance) are one API call with cosmetic staging.
- **Fix**: Resolves automatically with #1 — step 3 becomes a real client-side `approve()` tx, step 4 becomes the API call for `transferFrom()` + `mint()`. The delay becomes unnecessary.

### 8. Allocate API — anyone can write to HCS impact topic
- **Files**: `frontend/app/api/issuer/allocate/route.ts:5-17`
- **Issue**: No auth. Issuer dashboard gates via `isAgent` client-side, but the API endpoint accepts any POST. Anyone with the URL can submit fake impact data to the HCS topic.
- **Fix**: Add wallet signature verification (same as #2). Verify `signerAddress === process.env.DEPLOYER_ADDRESS`.

### 9. Contract address duplication between @coppice/common and env vars
- **Files**: `packages/common/src/generated.ts`, `frontend/lib/constants.ts:15-17`
- **Issue**: Testnet addresses baked into `@coppice/common` package (generated by wagmi CLI) AND overridable by `NEXT_PUBLIC_*` env vars. Two sources of truth — redeployment requires updating both.
- **Note**: Not blocking. Document that `@coppice/common` addresses are the source of truth and env vars are overrides for non-standard deployments.

### 10. Mirror Node calls not resilient to transient failures
- **Files**: `frontend/app/api/purchase/route.ts:58-68`, `frontend/hooks/use-hts.ts:15-23`
- **Issue**: No retry on Mirror Node API calls. Hedera Mirror Node returns transient 502s. The purchase route's `getEusdBalance()` returns 0 on failure, which could block a purchase ("Insufficient eUSD: 0") even though the investor has funds.
- **Fix**: Add retry with exponential backoff. A simple 3-attempt retry with 500ms/1s/2s delays would handle most transient failures. At minimum, fix the purchase route — the client-side hook is less critical since it's only for display.

### 11. Topic IDs silently fail when unset
- **Files**: `frontend/lib/constants.ts:21-22`, `frontend/hooks/use-hcs-audit.ts:23-26`
- **Issue**: Missing `NEXT_PUBLIC_AUDIT_TOPIC_ID` or `NEXT_PUBLIC_IMPACT_TOPIC_ID` env vars fall back to empty string. The hook checks `if (!topicId)` and returns empty state — compliance monitor page shows "No events recorded yet" with no indication that the config is broken.
- **Fix**: Add a build-time check in `next.config.ts` or a runtime warning in the UI: "HCS topic not configured — audit trail unavailable."

---

## Minor

### 12. BOND_DETAILS hardcoded, not from chain
- **Files**: `frontend/lib/constants.ts:35-42`
- **Issue**: Bond name, symbol, coupon, maturity are static constants. Name/symbol could be read from the token contract. Coupon/maturity don't exist on-chain (ERC-3643 has no such fields).
- **Note**: Acceptable for demo. A production system would store bond metadata in HCS or use ERC-3643's compliance data fields.

### 13. Refund error message is misleading
- **Files**: `frontend/app/api/purchase/route.ts:180-186`
- **Issue**: If CPC mint fails AND the eUSD refund also fails, the API returns `"CPC mint failed (eUSD refunded): ..."` even though the refund didn't succeed. The server logs "eUSD refund FAILED" but the client gets the wrong message.
- **Fix**: Track refund success and return accurate message: `"CPC mint failed (eUSD refund FAILED — contact support)"`.

### 14. Unused API_KEY env var
- **Files**: Root `.env:53`, `frontend/.env.local.example:21`
- **Issue**: `API_KEY=coppice-demo-key` defined but never referenced anywhere.
- **Fix**: Remove if implementing wallet signature auth (#2). Or implement simple header check as a fallback.

### 15. Event logger has no retry or backoff
- **Files**: `services/src/event-logger.ts:208`
- **Issue**: Fixed 5s `setInterval`, no exponential backoff. Failed HCS submissions (line 193-195) are logged and lost — the event is never retried.
- **Note**: Acceptable for demo daemon. Production would need a persistent queue + retry logic.
