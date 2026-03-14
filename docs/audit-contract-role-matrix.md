# Contract Role Matrix

Every contract function the frontend and middleware call, who can call it, what role is required, and whether the current architecture provides that role correctly.

---

## Roles Defined in the System

| Role | Holder(s) | How Assigned | Checked Via |
|------|-----------|-------------|-------------|
| Token Owner | Deployer `0xEB974bA...EEceE` | `deploy.ts:177` — `tokenDetails.owner = deployer.address` | `token.owner()` (inherited from OZ Ownable) |
| Token Agent | Deployer only | `deploy.ts:184` — `tokenDetails.tokenAgents = [deployer.address]` | `token.isAgent(address)` |
| IR Agent (Identity Registry Agent) | Deployer + Token contract | `deploy.ts:183` — `tokenDetails.irAgents = [deployer.address]`; `setup-demo.ts:184` — `identityRegistry.addAgent(token address)` | `identityRegistry.isAgent(address)` |
| Claim Issuer Signing Key | Random wallet (private key in `deployed-addresses.json` and `.env`) | `deploy.ts:141` — `ethers.Wallet.createRandom()` | Key hash stored in ClaimIssuer contract via `addKey()` |
| HCS Submit Key | Deployer (operator key) | `hcs-setup.ts:18` — `setSubmitKey(operatorKey)` | Topics require this key to submit messages |
| HTS Admin/Supply Key | Deployer (operator key) | `hts-setup.ts:80-81` — `setAdminKey(operatorKey).setSupplyKey(operatorKey)` | Token admin operations |

---

## Token Contract (T-REX Token — `0x17e19B53981370a904d0003Ba2D336837a43cbf0`)

### Read Functions (anyone can call)

| Function | Frontend Location | Hook | What It Returns | Notes |
|----------|------------------|------|-----------------|-------|
| `totalSupply()` | `BondDetails.tsx:12` | `useToken().totalSupply` | `bigint` — total minted tokens | Called once via `useEffect([], [])`, no refresh |
| `balanceOf(address)` | `InvestorPortal.tsx:26` | `useToken().balanceOf` | `bigint` — user's CPC balance | Polls every 10s via `setInterval` |
| `paused()` | `BondDetails.tsx:13`, `IssuerDashboard.tsx:28` | `useToken().paused` | `boolean` | Called once via `useEffect`, never refreshed |
| `isFrozen(address)` | **Not called from frontend** | `useToken().isFrozen` (defined but unused) | `boolean` | In ABI at `contracts.ts:17` but no component calls it |
| `isAgent(address)` | **Not called from frontend** | `useToken().isAgent` (defined but unused) | `boolean` | In ABI at `contracts.ts:18` but no component calls it |
| `name()` | **Not called** | N/A | `string` | In ABI at `contracts.ts:6` but `BOND_DETAILS.name` is hardcoded instead |
| `symbol()` | **Not called** | N/A | `string` | In ABI at `contracts.ts:7` but `BOND_DETAILS.symbol` is hardcoded |
| `decimals()` | **Not called** | N/A | `uint8` | In ABI at `contracts.ts:8` but hardcoded as 18 in `ethers.parseEther`/`formatEther` usage |

### Write Functions

| Function | Frontend Location | Hook | Required Role | Current Caller | Will It Work? |
|----------|------------------|------|--------------|---------------|---------------|
| `mint(to, amount)` | `TransferFlow.tsx:67` (purchase flow step 4) | `useToken().mint` | **Token Agent** | Connected wallet (investor e.g. Alice) | **NO — reverts.** Only deployer is agent. The entire purchase flow fails at this step for any non-deployer wallet. |
| `mint(to, amount)` | `IssuerDashboard.tsx:35` (mint form) | `useToken().mint` | **Token Agent** | Connected wallet | Works only if deployer wallet is connected. No UI check prevents non-agents from trying. |
| `transfer(to, amount)` | **Not called from frontend** | `useToken().transfer` (defined but unused) | Sender must be: verified, not frozen, compliant, token not paused | N/A | N/A — not used. Would be relevant for secondary market transfers. |
| `pause()` | `IssuerDashboard.tsx:63` | `useToken().pause` | **Token Owner** (via OZ Ownable `onlyOwner`) | Connected wallet | Works only if deployer connected. |
| `unpause()` | `IssuerDashboard.tsx:65` | `useToken().unpause` | **Token Owner** | Connected wallet | Works only if deployer connected. |
| `setAddressFrozen(addr, freeze)` | `IssuerDashboard.tsx:49` | `useToken().setAddressFrozen` | **Token Agent** | Connected wallet | Works only if deployer connected. |

---

## IdentityRegistry Contract (`0x03ecdB8673d65b81752AC14dAaCa797D846c1B31`)

### Read Functions (anyone can call)

| Function | Frontend Location | Hook | What It Returns | Notes |
|----------|------------------|------|-----------------|-------|
| `isVerified(address)` | `ComplianceStatus.tsx:55`, `TransferFlow.tsx:40` | `useIdentity().isVerified` | `boolean` — true if identity registered + has all required claims from trusted issuers | Called in compliance check flow and purchase step 1 |
| `investorCountry(address)` | `ComplianceStatus.tsx:63` | `useIdentity().getCountry` | `uint16` — ISO country code | Used for jurisdiction display. Returns 0 if no identity. |
| `identity(address)` | **Not displayed in UI** | `useIdentity().getIdentity` | `address` — ONCHAINID proxy address | Defined in hook but never called by any component |
| `contains(address)` | `ComplianceStatus.tsx:37` | `useIdentity().isRegistered` | `boolean` — true if address registered (even without valid claims) | First check in compliance flow |

### Write Functions — None called from frontend

The IdentityRegistry has write functions (`registerIdentity`, `batchRegisterIdentity`, `deleteIdentity`, etc.) but these are only called from `setup-demo.ts` via Hardhat scripts, never from the frontend.

---

## ModularCompliance Contract (`0xb6F624B66731AFeEE1443b3F857Cd73b682af4cf`)

### Read Functions

| Function | Frontend Location | Hook | What It Returns | Notes |
|----------|------------------|------|-----------------|-------|
| `canTransfer(from, to, amount)` | `ComplianceStatus.tsx:76-79`, `TransferFlow.tsx:51` | `useCompliance().canTransfer` | `boolean` — checks all compliance modules (CountryRestrict, MaxBalance, SupplyLimit) | In ComplianceStatus: called with `(ZeroAddress, account, 1 ether)`. In TransferFlow: called with `(ZeroAddress, account, parsedAmount)`. Using ZeroAddress as `from` is correct for minting/primary issuance checks. |

### Compliance Module Behavior

The 3 modules attached to this compliance contract:

| Module | Address | What It Checks | Config |
|--------|---------|---------------|--------|
| CountryRestrictModule | `0xfeafC...3755` | Blocks transfers to/from addresses in restricted countries | China (156) restricted — set in `deploy.ts:191` |
| MaxBalanceModule | `0x9Dab...4604` | Per-address max holding | 1,000,000 CPC — set in `deploy.ts:192` |
| SupplyLimitModule | `0x4f88...d1F` | Total supply cap | 1,000,000 CPC — set in `deploy.ts:193` |

**Important edge case:** `canTransfer` checks all three modules. If a transfer would push the recipient above MaxBalance OR total supply above SupplyLimit, it returns false. Currently total supply is 100,000 and max balance is 1,000,000, so these won't trigger for small amounts, but a purchase of >900,000 CPC would fail compliance even for Alice.

---

## ClaimIssuer Contract (`0x6746C2A65b834F3A83Aa95eCAc9C80dF9Bf2AB7A`)

**Not called from frontend.** Only used during `setup-demo.ts` for issuing claims to demo wallets. The signing key's private key is stored in `deployed-addresses.json` as `claimIssuerSigningKey`.

---

## HCS Topics (via Hedera SDK, not EVM)

| Topic | ID | Submit Key | Written By | Read By |
|-------|----|-----------|-----------|---------|
| Audit | `0.0.8214934` | Deployer operator key | `event-logger.ts` middleware (polls EVM events, submits JSON) | Frontend `useHCSAudit("audit")` via Mirror Node REST |
| Impact | `0.0.8214935` | Deployer operator key | **Nothing currently writes to this.** `IssuerDashboard.tsx:80` shows a success message but does NOT submit to HCS. | Frontend `useHCSAudit("impact")` via Mirror Node REST (always empty) |

**Critical gap:** The impact topic has never had a message submitted to it. The `ProjectAllocation` component reads from it but will always show "No allocations recorded yet."

---

## HTS eUSD Token (`0.0.8214937`)

| Operation | Where | How | Notes |
|-----------|-------|-----|-------|
| Created | `hts-setup.ts:72-82` | `TokenCreateTransaction` — 100,000 eUSD, 2 decimals | One-shot script |
| Associated | `hts-setup.ts:102-108` | `TokenAssociateTransaction` for Alice, Bob, Charlie, Diana | Each wallet signed their own association |
| Distributed | `hts-setup.ts:123-129` | `TransferTransaction` — 10,000 eUSD to each wallet | From treasury (deployer) |
| Balance read | `useHTS.ts:12-30` | Mirror Node REST: resolve EVM address → account ID → token balance | Two HTTP calls per balance check |
| **Transfer during purchase** | `TransferFlow.tsx:62` | **`setTimeout(1500)` — SIMULATED** | No actual HTS transfer. No HTS system contract call. No backend API. |

**Full eUSD flow gap:** The purchase flow pretends to transfer eUSD but doesn't. The investor's eUSD balance never changes. The deployer's eUSD balance never increases. This is visible to anyone checking Mirror Node or the portfolio display after a "successful" purchase.

---

## Event Logger Middleware (`middleware/src/event-logger.ts`)

| Aspect | Detail |
|--------|--------|
| Input | Polls `eth_getLogs` on token contract address every 5s |
| Events parsed | `Transfer` (→ MINT if from=0x0, else TRANSFER), `Paused` (→ TOKEN_PAUSED), `Unpaused` (→ TOKEN_UNPAUSED), `AddressFrozen` (→ WALLET_FROZEN/WALLET_UNFROZEN) |
| Output | JSON messages to HCS audit topic via `TopicMessageSubmitTransaction` |
| Dedup | `seenTxs` Set keyed on `txHash-logIndex` (in-memory, lost on restart) |
| Block tracking | `lastBlock` variable (in-memory, starts from current block on launch — misses historical events) |
| Addresses | Abbreviated to `0xXXXX...XXXX` format in HCS messages to stay under 1KB |
| Error handling | Catches poll errors, logs and continues. Catches HCS submit errors, logs and continues. |
| Lifecycle | Long-running process, must be manually started (`npx tsx src/event-logger.ts`), handles SIGINT for clean shutdown |

**Operational note:** The event logger must be running during demos for audit events to appear. If it's not running, new transactions won't be logged to HCS. Historical events from before the logger started are NOT retroactively captured.

---

## Critical Findings

### Finding 1: Purchase Flow Broken for All Non-Deployer Wallets (SEVERITY: CRITICAL)

**Location:** `TransferFlow.tsx:67`
**Issue:** Calls `mint(account, parsedAmount)` using investor's signer. Only token agents can mint. Deployer is the only agent.
**Impact:** The primary user flow (verified investor buys bonds) fails for Alice, Diana, and any real investor.
**Note:** The deployer wallet "succeeds" at this flow, which is misleading — it only works because the deployer happens to be an agent.

### Finding 2: eUSD Payment is Simulated (SEVERITY: HIGH)

**Location:** `TransferFlow.tsx:62`
**Issue:** `await new Promise((r) => setTimeout(r, 1500))` — no HTS transfer occurs.
**Impact:** No eUSD changes hands. The "1:1 exchange rate" display is cosmetic. Judges will see eUSD balance unchanged after purchase.

### Finding 3: No Role-Based Access Control in UI (SEVERITY: MEDIUM)

**Location:** `IssuerDashboard.tsx` — entire page
**Issue:** Any connected wallet sees all issuer controls. No check for `isAgent()` or owner. Non-deployer wallets get raw EVM revert errors.
**Fix:** Check `isAgent(account)` on mount, show "not authorized" message for non-agent wallets.

### Finding 4: Impact Topic is Empty (SEVERITY: MEDIUM)

**Location:** `IssuerDashboard.tsx:80` (UI-only allocation) + `ProjectAllocation.tsx` (reads from empty topic)
**Issue:** The "Allocate to HCS" button shows a success toast but doesn't submit to HCS. The topic has 0 messages.
**Impact:** The Use of Proceeds chart is always empty. This weakens the green bond narrative.

### Finding 5: Stale Data in BondDetails and IssuerDashboard (SEVERITY: LOW)

**Location:** `BondDetails.tsx:11-14` — `useEffect([], [])` fetches once; `IssuerDashboard.tsx:28` — `paused().then(setIsPaused)` in `useEffect([], [])`
**Issue:** Total supply, paused status fetched once and never refreshed. If deployer mints tokens, other users see stale supply until page reload. If deployer pauses, the "Active" badge stays green.
**Fix:** Add polling interval or invalidate after write operations.

### Finding 6: Provider Created Per Hook Render (SEVERITY: LOW)

**Location:** `useToken.ts:11`, `useIdentity.ts:7`, `useCompliance.ts:7`
**Issue:** Each hook creates `new ethers.JsonRpcProvider(JSON_RPC_URL)` in the function body (runs on every render). This is technically outside a useEffect/useMemo, meaning a new provider object is created each time the hook is called.
**Actual impact:** Minimal — ethers.js `JsonRpcProvider` is lightweight and doesn't open persistent connections. But it's wasteful and causes the `readContract` reference to change on every render, which means the `useCallback` dependency arrays (which are empty `[]`) are technically stale. The callbacks close over the first `readContract` instance, which happens to work because all instances point to the same RPC URL. Still, should be a singleton.

### Finding 7: E2E Tests Don't Test Purchase Completion (SEVERITY: MEDIUM)

**Location:** `write-operations.spec.ts:123-152`
**Issue:** The purchase flow test (`should run Alice compliance checks and purchase flow UI`) intentionally stops after "eUSD payment processed" (step 3). The comment says "The mint step requires agent role." This means the E2E tests don't catch the mint failure — it's a known gap that was deferred.
**Impact:** No test validates the end-to-end purchase. When we fix the purchase flow, we need to add a test that validates the complete flow including token receipt.

### Finding 8: Contracts Not Verified on HashScan (SEVERITY: MEDIUM)

**Location:** `contracts/hardhat.config.ts` — no `hashscan-verify` plugin; `verify-testnet.ts` does state checks only
**Issue:** No source code verification on HashScan. All deployed contracts show as unverified bytecode.
**Impact:** Judges clicking "Contract" on HashScan see no source code. Reduces credibility of the "Integration" score.

### Finding 9: Private Keys in Multiple Locations (SEVERITY: INFO)

**Location:** `.env` (all wallet private keys), `deployed-addresses.json` (claimIssuerSigningKey), `e2e/tests/*.spec.ts` (wallet private keys hardcoded), `e2e/fixtures/wallet-mock.ts` (KEY_TO_ADDRESS map)
**Issue:** Private keys exist in 4 different locations. The E2E test files have hardcoded private keys (not from .env). The wallet-mock has a separate KEY_TO_ADDRESS lookup.
**Impact for refactoring:** When changing key management, must update all 4 locations. The E2E keys are testnet-only so security risk is minimal, but the duplication is a maintenance burden.

### Finding 10: `create-diana.ts` Still Exists (SEVERITY: INFO)

**Location:** `middleware/src/create-diana.ts`
**Issue:** One-shot script that was already executed (Diana account created). Uses deprecated `setKey()` and `setAlias()` methods. Should be deleted.

### Finding 11: Address Duplication Across Codebase (SEVERITY: INFO)

Contract addresses exist in:
1. `contracts/deployments/deployed-addresses.json` — 22 addresses including impl contracts
2. `.env` — TOKEN_ADDRESS, IDENTITY_REGISTRY_ADDRESS, COMPLIANCE_ADDRESS (subset)
3. `frontend/src/lib/constants.ts` — reads from VITE_ env vars
4. `e2e/tests/write-operations.spec.ts:8` — TOKEN address hardcoded
5. `CLAUDE.md` — documented addresses

When redeploying, must update .env manually, then restart frontend to pick up new VITE_ vars. No automated pipeline. The `deployed-addresses.json` → `.env` → `VITE_*` → `constants.ts` chain is manual and error-prone.
