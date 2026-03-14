# Data Flow Trace

Every piece of data displayed in the UI, traced from its source through the full chain to the component that renders it. Includes all state variables, effects, intervals, and edge cases.

---

## App Shell (`App.tsx`)

### Component Tree
```
BrowserRouter
  WalletProvider (context: account, provider, signer, chainId, walletLabel, connect, disconnect, isConnecting)
    ErrorBoundary (class component, catches render errors)
      Layout
        Nav (sticky, glassmorphism backdrop)
          NavLink to "/" (Invest), "/issue" (Issuer), "/monitor" (Compliance)
          MobileMenu (shown when hamburger toggled, hidden sm:+)
          WalletButton
        Routes
          "/" -> InvestorPortal
          "/issue" -> IssuerDashboard
          "/monitor" -> ComplianceMonitor
        Footer (ERC-3643 link, HashScan link)
```

### WalletProvider State (`WalletProvider.tsx`)

| State Variable | Type | Initial | Updated By | Consumed By |
|---------------|------|---------|-----------|-------------|
| `account` | `string \| null` | `null` | `connect()` → `eth_requestAccounts`, `handleAccountsChanged` listener | All pages via `useWallet().account` |
| `provider` | `ethers.BrowserProvider \| null` | `null` | `connect()`, `handleAccountsChanged` | Not directly used by any component (signer used instead) |
| `signer` | `ethers.Signer \| null` | `null` | `connect()` → `browserProvider.getSigner()`, `handleAccountsChanged` | `useToken()` write operations |
| `chainId` | `number \| null` | `null` | `connect()` → hardcoded to `HEDERA_CHAIN_ID` (296) | Not used anywhere after being set |
| `isConnecting` | `boolean` | `false` | `connect()` start/end | WalletButton disabled state |
| `walletLabel` | `string` (computed) | `""` | Derived from `account` via `DEMO_WALLETS` lookup, falls back to `0xABCD...1234` | WalletButton display |

**Events listened to:**
- `window.ethereum.on("accountsChanged")` — updates account, creates new BrowserProvider, refreshes signer
- `window.ethereum.on("chainChanged")` — `window.location.reload()` (full page reload)

**Chain switching:** If wrong chain, attempts `wallet_switchEthereumChain`. If chain 296 not known (code 4902), calls `wallet_addEthereumChain` with Hedera Testnet config.

**Edge case:** `provider` state is set but never consumed by child components. The hooks create their own `JsonRpcProvider` for reads and use `signer` from context for writes. The `BrowserProvider` in state is effectively unused after connection.

---

## BondDetails Component (`BondDetails.tsx`)

### Data Displayed

| UI Element | Value Source | Chain | Freshness |
|-----------|-------------|-------|-----------|
| Bond name "Coppice Green Bond" | `BOND_DETAILS.name` (`constants.ts:28`) | None — hardcoded | Static, never changes |
| Issuer "Coppice Finance" | `BOND_DETAILS.issuer` (`constants.ts:33`) | None — hardcoded | Static |
| Symbol "CPC" | `BOND_DETAILS.symbol` (`constants.ts:29`) | None — hardcoded | Static |
| Coupon rate "4.25%" | `BOND_DETAILS.couponRate` (`constants.ts:30`) | None — hardcoded | Static |
| Maturity "2028-03-15" | `BOND_DETAILS.maturity` (`constants.ts:31`) | None — hardcoded | Static |
| Currency "eUSD" | `BOND_DETAILS.currency` (`constants.ts:32`) | None — hardcoded | Static (not displayed in current UI) |
| Total supply | Token contract `totalSupply()` → `ethers.formatEther()` → `toLocaleString()` | Hedera EVM via Hashio | **STALE — fetched once on mount, no interval** |
| Active/Paused badge | Token contract `paused()` | Hedera EVM via Hashio | **STALE — fetched once on mount, no interval** |

**State:**
- `supply: string` — init `"--"`, set once from `totalSupply()`
- `isPaused: boolean | null` — init `null`, set once from `paused()`, shows badge only when non-null

**Effect:** `useEffect([], [])` — runs once on mount. No dependency on account or any other changing value. Never re-fetches.

**Rendering note:** Component is rendered inside InvestorPortal regardless of wallet connection. Bond details are visible to everyone (read-only public data).

---

## InvestorPortal Page (`InvestorPortal.tsx`)

### Layout
```
<div className="space-y-6">
  <BondDetails />                          // always visible
  <div className="grid lg:grid-cols-3">
    <div className="lg:col-span-2">
      <ComplianceStatus />                  // shows checks when wallet connected
      <TransferFlow enabled={eligible} />   // purchase form
    </div>
    <div>                                   // sidebar
      <Portfolio card>                      // CPC + eUSD balances
    </div>
  </div>
</div>
```

### Portfolio Data

| UI Element | Value Source | Full Chain | Freshness |
|-----------|-------------|-----------|-----------|
| CPC Balance | `useToken().balanceOf(account)` → `ethers.formatEther()` → `toLocaleString()` | `useToken()` → `new JsonRpcProvider(JSON_RPC_URL)` → `new Contract(TOKEN_ADDRESS, TOKEN_ABI, provider)` → `.balanceOf(account)` → Hashio RPC → Token contract | Polls every 10s via `setInterval(loadBalances, 10000)` |
| eUSD Balance | `useHTS().getEusdBalance(account)` | `useHTS()` → `fetch(MIRROR_NODE/api/v1/accounts/${evmAddr})` → get `accountData.account` (Hedera ID) → `fetch(MIRROR_NODE/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID})` → find token entry → `balance / 100` (2 decimals) | Polls every 10s (same interval as CPC) |

**State:**
- `eligible: boolean` — init `false`, set by `ComplianceStatus` via `onEligibilityChange` callback prop
- `cpcBalance: string` — init `"--"`, updated every 10s
- `eusdBalance: string` — init `"--"`, updated every 10s

**Effect:** `useEffect([account])` — when account changes (connect/disconnect/switch):
- If null: reset both balances to `"--"`, clear interval
- If set: call `loadBalances()` immediately, start 10s interval
- Cleanup: clear interval

**Edge case:** The `useEffect` dependency array is `[account]` but the callbacks reference `balanceOf` and `getEusdBalance` from hooks. These hook functions are recreated on each render (they're `useCallback` with `[]` deps but the hook itself creates a new provider/contract on each render). This works because the callbacks capture the first provider instance which points to the same URL. But it's technically a stale closure.

---

## ComplianceStatus Component (`ComplianceStatus.tsx`)

### Props
- `onEligibilityChange?: (eligible: boolean) => void` — called with final eligibility result

### Data Displayed (4 sequential checks)

| Check # | Label | Source | Full Chain | Pass Condition |
|---------|-------|--------|-----------|---------------|
| 1 | Identity Registered | `useIdentity().isRegistered(account)` | `new JsonRpcProvider` → `new Contract(IDENTITY_REGISTRY_ADDRESS, IR_ABI)` → `.contains(account)` | Returns `true` |
| 2 | KYC / AML / Accredited | `useIdentity().isVerified(account)` | Same contract → `.isVerified(account)` | Returns `true` (all 3 claim topics satisfied from trusted issuers) |
| 3 | Jurisdiction Check | `useIdentity().getCountry(account)` | Same contract → `.investorCountry(account)` → cast to `Number` | Country NOT in `RESTRICTED_COUNTRIES = [156]` (hardcoded at line 64) |
| 4 | Compliance Module | `useCompliance().canTransfer(ZeroAddress, account, parseEther("1"))` | `new JsonRpcProvider` → `new Contract(COMPLIANCE_ADDRESS, COMPLIANCE_ABI)` → `.canTransfer(0x0, account, 1e18)` | Returns `true` |

**State:**
- `checks: CheckResult[]` — array of `{label, status, detail?}` where status is `"pass" | "fail" | "loading"`
- `eligible: boolean` — init `false`, set to `true` only when ALL checks pass

**Flow:** Checks run sequentially (not parallel). Each check updates the array and triggers a re-render showing progress. If check 1 (registered) fails, checks 2-4 are skipped and all set to "fail" with "Not registered".

**Country names:** Hardcoded map at line 65: `{276: "Germany", 250: "France", 156: "China", 840: "United States"}`. Any other country code shows as "Code XXX".

**Edge case on restricted countries list:** The `RESTRICTED_COUNTRIES = [156]` at line 64 is hardcoded. The actual on-chain restriction is set in CountryRestrictModule. If someone called `batchRestrictCountries` to add more countries, the UI jurisdiction label would show "Approved" for the new country, but the compliance module check (step 4) would correctly show "Transfer blocked." So the final eligibility determination is correct, but the step 3 label/detail could be misleading.

**Effect:** `useEffect([account])` — runs when account changes. If null, clears checks and sets eligible=false. Otherwise runs `runChecks()`.

---

## TransferFlow Component (`TransferFlow.tsx`)

### Props
- `enabled: boolean` — controls whether form is interactive (comes from ComplianceStatus eligibility)

### State
- `amount: string` — input value
- `steps: Step[]` — array of `{label, status, detail?}` showing step-by-step progress
- `running: boolean` — prevents double-submission

### Purchase Flow (Step by Step)

| Step | Code Line | Action | Source | Result |
|------|----------|--------|--------|--------|
| 1 | Lines 40-48 | `isVerified(account)` | IdentityRegistry contract via `useIdentity` hook → `new JsonRpcProvider` → Hashio RPC | Real on-chain check. Returns true for Alice/Diana/Charlie, false for Bob. |
| 2 | Lines 51-57 | `canTransfer(ZeroAddress, account, parsedAmount)` | ModularCompliance contract via `useCompliance` hook → `new JsonRpcProvider` → Hashio RPC | Real on-chain check. Checks CountryRestrict + MaxBalance + SupplyLimit. Fails for Charlie (CN). |
| 3 | Line 62 | `await new Promise((r) => setTimeout(r, 1500))` | **Nothing** | **SIMULATED.** 1.5s delay to fake a payment. No HTS transfer. No eUSD deducted. No API call. |
| 4 | Line 67 | `mint(account, parsedAmount)` | Token contract via `useToken` hook → `getTokenContract(signer)` → `.mint(account, amount)` → MetaMask `eth_sendTransaction` → Hashio RPC | **BROKEN.** Calls mint using the connected wallet's signer. `mint()` has `onlyAgent` modifier. Only deployer is agent. Reverts with `AgentRole: caller does not have the Agent role` for Alice/Diana/any non-deployer. |

**Error handling:** If any step fails, the `catch` block finds the currently active step and marks it as "error" with the error message (truncated to 60 chars). The `finally` block sets `running = false`.

**UI state:**
- When `enabled=false` (not eligible): Shows red text "must pass all compliance checks", input and button disabled
- When `enabled=true` and no steps yet: Shows cost preview "Cost: X eUSD (1:1 exchange rate)"
- When running: Shows step progress with spinner/check/X icons
- After completion: Steps remain visible, amount cleared on success

**E2E test note:** `write-operations.spec.ts:123-152` tests this flow but intentionally stops after step 3 ("eUSD payment processed"). It does NOT attempt step 4 because it would fail. The test comment acknowledges this.

---

## IssuerDashboard Page (`IssuerDashboard.tsx`)

### Access Control
- **NO role check.** Any connected wallet sees all controls.
- If `!account`: shows "Connect your issuer wallet" placeholder with shield icon
- If account set: shows all 4 control cards regardless of role

### State Variables (10 total)

| Variable | Type | Purpose |
|----------|------|---------|
| `mintTo` | `string` | Recipient address input |
| `mintAmount` | `string` | Mint amount input |
| `mintStatus` | `{type, msg} \| null` | Success/error message for mint |
| `freezeAddr` | `string` | Freeze target address input |
| `freezeAction` | `"freeze" \| "unfreeze"` | Last action taken (for status msg) |
| `freezeStatus` | `{type, msg} \| null` | Success/error for freeze |
| `isPaused` | `boolean \| null` | Token paused state |
| `pauseStatus` | `{type, msg} \| null` | Success/error for pause toggle |
| `project` | `string` | Proceeds project name input |
| `category` | `string` | Proceeds category dropdown (default "Renewable Energy") |
| `proceedsAmount` | `string` | Proceeds USD amount input |
| `proceedsStatus` | `{type, msg} \| null` | Success/error for allocation |

### Data Flows

| Card | Action | Source | Real? | Notes |
|------|--------|--------|-------|-------|
| **Mint Tokens** | `handleMint()` → `mint(mintTo, parseEther(mintAmount))` | Token contract via signer → Hashio RPC | Real if deployer | Uses `useToken().mint`. Only agents can call. |
| **Freeze/Unfreeze** | `handleFreeze(action)` → `setAddressFrozen(freezeAddr, action === "freeze")` | Token contract via signer | Real if deployer | Two buttons, same input field. |
| **Token Pause Control** | `handlePauseToggle()` → `pause()` or `unpause()` | Token contract via signer | Real if deployer | Shows current status via `isPaused` state. |
| **Allocate Proceeds** | `handleAllocateProceeds()` → **`setProceedsStatus({ type: "success", msg: "..." })`** | **Nothing on-chain** | **NO — SIMULATED** | Just sets a success message string. Does not submit to HCS. Message explicitly says "(HCS submission requires middleware)". |

**Paused state:** Fetched once via `useEffect([], [])` → `paused().then(setIsPaused)`. After toggling pause/unpause, the local state `isPaused` is updated optimistically (line 66/68). But BondDetails on the investor page still shows the old value.

**Category dropdown options:** Renewable Energy, Energy Efficiency, Clean Transportation, Sustainable Water, Green Buildings. These match ICMA Green Bond Principles categories.

**Status message format:** Mint shows `"Minted ${amount} CPC to ${address.slice(0,10)}..."`. Freeze shows `"Froze/Unfroze ${address.slice(0,10)}..."`. Pause shows `"Token paused/unpaused"`. Allocation shows `"Allocated $${amount} to ${project} (HCS submission requires middleware)"`.

---

## ComplianceMonitor Page (`ComplianceMonitor.tsx`)

### Data Displayed

| UI Element | Source | Full Chain | Freshness |
|-----------|--------|-----------|-----------|
| Total Events count | `events.length` | `useHCSAudit("audit")` → `fetch(MIRROR_NODE/api/v1/topics/${AUDIT_TOPIC_ID}/messages?order=asc&limit=100)` → base64 decode each message → JSON.parse → accumulate in state | Polls every 5s |
| Approvals count | `events.filter(e => ["TRANSFER","MINT","TOKEN_UNPAUSED","WALLET_UNFROZEN"].includes(e.type)).length` | Same events array, filtered | Same |
| Restrictions count | `events.filter(e => ["TOKEN_PAUSED","WALLET_FROZEN"].includes(e.type)).length` | Same events array, filtered | Same |

### Event Categorization

| Event Type | Category | Badge Color |
|-----------|----------|-------------|
| TRANSFER | Approval | bond-green |
| MINT | Approval | bond-green |
| TOKEN_UNPAUSED | Approval | bond-green |
| WALLET_UNFROZEN | Approval | bond-green |
| TOKEN_PAUSED | Restriction | bond-red |
| WALLET_FROZEN | Restriction | bond-red |
| PROCEEDS_ALLOCATED | Neither (not in either filter) | bond-amber |

**Note:** PROCEEDS_ALLOCATED events from the impact topic are NOT shown on this page. The ComplianceMonitor only reads `useHCSAudit("audit")`. The `AuditEventFeed` component on this page also uses `topicType="audit"`.

---

## AuditEventFeed Component (`AuditEventFeed.tsx`)

### Props
- `topicType: "audit" | "impact"` — defaults to `"audit"`

### State
- `filter: string` — current filter selection, init `"ALL"`

### Data Flow

Events come from `useHCSAudit(topicType)` hook → Mirror Node REST polling.

| Displayed per event | Source field | Notes |
|--------------------|------------|-------|
| Event type badge | `event.type` | Colored per `EVENT_BADGES` map |
| Timestamp | `event.consensusTimestamp` (falls back to `event.ts`) | Formatted via `formatTimestamp()` — parses float seconds to Date |
| Transaction link | `event.tx` | Links to `https://hashscan.io/testnet/transaction/${tx}` |
| Data fields | `event.data` — object, iterated with `Object.entries()` | Shows key:value pairs inline (e.g. "from: 0xABCD... to: 0xEFGH... amount: 100.0") |

**Filter UI:** Dynamic filter buttons generated from unique event types in the data. First button is always "ALL". Clicking a filter shows only matching events. Filter buttons have `min-h-[44px] min-w-[44px]` for mobile touch targets.

**Scroll:** Events in a `max-h-96 overflow-y-auto` container (384px max height, scrollable).

---

## ProjectAllocation Component (`ProjectAllocation.tsx`)

### Data Flow

Reads from impact topic: `useHCSAudit("impact")` → filters for `type === "PROCEEDS_ALLOCATED"` events.

| Displayed | Source field | Notes |
|-----------|------------|-------|
| Bar chart by category | `totalByCategory` computed from events | Categories: Renewable Energy, Energy Efficiency, Clean Transportation, Sustainable Water, Green Buildings, Other |
| Project list | Individual `PROCEEDS_ALLOCATED` events | Shows project name, category, amount |
| Grand total | Sum of all amounts | Used for percentage calculations |

**Current state:** Always shows "No allocations recorded yet" because the impact topic has 0 messages.

**Category colors:** Renewable Energy=bond-green, Energy Efficiency=blue-500, Clean Transportation=purple-500, Sustainable Water=cyan-500, Green Buildings=emerald-500, Other=gray-500.

---

## useHCSAudit Hook (`useHCSAudit.ts`)

### State
- `events: AuditEvent[]` — accumulates all decoded messages
- `loading: boolean` — init `true`, set `false` after first fetch
- `lastSequenceRef: useRef(0)` — tracks last seen sequence number to avoid duplicates

### Polling Flow
1. Fetch `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?order=asc&limit=100`
2. For each message where `sequence_number > lastSequenceRef`:
   - Base64 decode: `atob(msg.message)`
   - JSON parse the decoded string
   - Spread parsed object + add `sequenceNumber` and `consensusTimestamp` from mirror node response
3. Append new events to state
4. Update `lastSequenceRef` to highest sequence number

**Limitation:** `limit=100` means only the first 100 messages are fetched. If there are >100 messages, older ones after 100 will never be fetched (no pagination via `next` link). This is fine for the current demo but would break at scale.

**Error handling:** Silently catches fetch errors and malformed JSON. On network error, retries on next 5s poll.

---

## useHTS Hook (`useHTS.ts`)

### Two-Step Mirror Node Query

1. **Resolve EVM address → Hedera account ID:**
   ```
   GET ${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}
   → response.account (e.g. "0.0.8213185")
   ```

2. **Get token balance:**
   ```
   GET ${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}
   → find token entry → balance / 100 (2 decimals)
   ```

**Edge case:** If the account doesn't exist on mirror node (e.g. brand new wallet), returns 0 silently. If EUSD_TOKEN_ID is empty string, returns 0 immediately.

**Performance:** Two HTTP requests per balance check. The account ID resolution could be cached (it never changes for a given EVM address).

---

## Summary: All Data by Freshness

### REAL (live on-chain or live from Mirror Node) — 16 items
- CPC balance (polls 10s)
- eUSD balance (polls 10s)
- ComplianceStatus 4 checks (run once per account change)
- TransferFlow steps 1-2 (identity verify, compliance check)
- HCS audit events (polls 5s)
- HCS event counts (derived from events)
- Wallet account/label/chain
- Issuer mint/freeze/pause actions (when deployer connected)

### HARDCODED — 8 items
- Bond name, symbol, coupon rate, maturity, issuer, currency (in `constants.ts`)
- Restricted countries list `[156]` (in `ComplianceStatus.tsx:64`)
- Country name map (in `ComplianceStatus.tsx:65`)

### STALE (fetched once, never refreshed) — 3 items
- BondDetails total supply
- BondDetails paused status
- IssuerDashboard paused status

### SIMULATED — 2 items
- eUSD payment in purchase flow (`setTimeout(1500)`)
- Proceeds allocation in issuer dashboard (UI-only success message)

### BROKEN — 1 item
- Purchase flow step 4: `mint()` reverts for non-agent callers

### ALWAYS EMPTY — 1 item
- ProjectAllocation / Use of Proceeds chart (impact topic has 0 messages)
