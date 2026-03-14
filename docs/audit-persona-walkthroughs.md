# Persona Walkthroughs

Predicted outcomes for every user flow as each demo wallet, based on code analysis and contract state.
These predictions should be verified against the live testnet before executing fixes.

---

## Deployer/Issuer — `0xEB974bA96c4912499C3B3bBD5A40617E1f6EEceE`

**Account ID:** 0.0.8213176
**Role:** Token Owner, Token Agent, IR Agent
**Identity:** Registered in IdentityRegistry, ONCHAINID deployed, all 3 claims (KYC/AML/ACCREDITED) issued
**Country:** 276 (Germany)
**CPC Balance:** ~100,000+ (initial mint + any subsequent mints from tests)
**eUSD Balance:** ~60,000+ (100,000 initial treasury minus 40,000 distributed to 4 wallets)

### / (Investor Portal)

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Page load (no wallet) | BondDetails visible, "Connect your wallet" in compliance section, portfolio hidden | None |
| Connect wallet | Shows "Deployer/Issuer" label with green dot, address hash visible on desktop, hidden on mobile | None |
| BondDetails loads | Total supply shows (formatted with commas), "Active" badge shows (token is unpaused) | Supply fetched once, won't update if someone else mints |
| ComplianceStatus runs | 4 checks run sequentially: (1) Identity Registered: PASS "ONCHAINID linked" (2) KYC/AML/Accredited: PASS "All claims verified" (3) Jurisdiction: PASS "Germany - Approved" (4) Compliance Module: PASS "Transfer permitted" → "Eligible to Invest" | None |
| Portfolio shows | CPC: ~100,000 (formatted). eUSD: ~60,000.00 (treasury remainder) | Polls every 10s |
| Enter amount "100", click Purchase | Step 1: PASS (identity verified). Step 2: PASS (compliance verified). Step 3: "eUSD payment processed" after 1.5s (SIMULATED). **Step 4: SUCCESS** — deployer IS a token agent, `mint()` succeeds. Amount cleared, all 4 steps green. | **Misleading success.** This works ONLY because deployer is agent. Creates false confidence that the flow works. eUSD balance doesn't change (payment was fake). CPC balance increases by 100 on next poll (10s). |
| Disconnect | Balances reset to "--", compliance checks cleared | None |

### /issue (Issuer Dashboard)

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Page load (no wallet) | "Connect your issuer wallet" with shield icon | None |
| Connect wallet | Shows all 4 cards: Mint, Freeze/Unfreeze, Pause Control, Allocate Proceeds | None |
| Pause Control initial | Shows "Active" with green pulse dot, "Pause Token" button (red styling) | Fetched once, `useEffect([], [])` |
| Mint 10 CPC to Alice `0x4f9a...1D762` | "Minting..." → "Minted 10 CPC to 0x4f9ad4Fd..." green success text | Real on-chain tx, ~5-10s on Hedera |
| Freeze Diana `0x35bc...bCdf` | "Froze 0x35bccFFf..." green success text | Real on-chain tx |
| Unfreeze Diana | "Unfroze 0x35bccFFf..." green success text | Real on-chain tx |
| Pause Token | Button changes to "Unpause Token" (green styling), "Token paused" success text, status shows "Paused" with red dot | Real tx. **But BondDetails on / page still shows "Active" until page reload.** |
| Unpause Token | Reverts to "Pause Token", "Token unpaused" success text | Real tx. |
| Allocate $50,000 to "Solar Farm Alpha", Renewable Energy | "Allocated $50,000 to Solar Farm Alpha (HCS submission requires middleware)" green text | **SIMULATED. Does NOT write to HCS. ProjectAllocation chart stays empty.** |

### /monitor (Compliance Monitor)

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Page load | Stats cards show: Total Events (count from HCS), Approvals (filtered count), Restrictions (filtered count) | None |
| Events load | Audit Event Feed shows events from HCS audit topic (MINTs, TRANSFER, TOKEN_PAUSED, etc.) with timestamps and HashScan links | Real data, polls every 5s |
| Filter buttons | "ALL" + one button per event type. Clicking filters the list. | None |
| ProjectAllocation | "No allocations recorded yet" (impact topic empty) | Always empty |

---

## Alice — Verified Investor — `0x4f9ad4Fd6623b23beD45e47824B1F224dA21D762`

**Account ID:** 0.0.8213185
**Role:** None (regular investor)
**Identity:** Registered, ONCHAINID deployed, all 3 claims issued
**Country:** 276 (Germany)
**CPC Balance:** Whatever deployer has minted to her (from setup-demo + any test mints). Initially 0 from deploy, but E2E tests mint 10+ to her.
**eUSD Balance:** 10,000.00

### / (Investor Portal) — THE PRIMARY DEMO FLOW

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Connect wallet | Shows "Alice" label | None |
| ComplianceStatus | (1) PASS: "ONCHAINID linked" (2) PASS: "All claims verified" (3) PASS: "Germany - Approved" (4) PASS: "Transfer permitted" → **"Eligible to Invest"** | None — this is the happy path |
| Portfolio | CPC: 0 or small amount. eUSD: 10,000.00 | Correct |
| Enter "100", click Purchase | Step 1: PASS. Step 2: PASS. Step 3: "eUSD payment processed" (1.5s fake delay). **Step 4: ERROR.** `mint()` reverts. Error message likely: "AgentRole: caller does not have the Agent role" or generic "Transaction failed" (truncated to 60 chars). Red X icon on step 4. | **CRITICAL BUG. The primary demo scenario fails.** Alice passes all compliance checks, appears eligible, clicks purchase, and gets an error. Judges will see this. |
| After failed purchase | Steps display shows 3 green checks + 1 red X. Amount field still has "100". eUSD balance unchanged (was never transferred). CPC balance unchanged. | User has no recourse. |
| Purchase cost preview | Shows "Cost: 100 eUSD (1:1 exchange rate)" — but this is never enforced | Cosmetic only |

### /issue (Issuer Dashboard)

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Connect wallet | Shows all 4 cards (no role check) | **Should show "not authorized"** |
| Mint 10 to any address | Error: revert (not agent) | Confusing revert error in UI |
| Freeze any address | Error: revert (not agent) | Same |
| Pause | Error: revert (not owner via Ownable) | Same |
| Allocate | "Success" message (simulated anyway) | Works but meaningless |

### /monitor — Works fine (read-only)

---

## Bob — Unverified — `0xad33bd43bd3c93ec956f00c2d9782b7ae929e2f7`

**Account ID:** 0.0.8214040
**Role:** None
**Identity:** NOT registered in IdentityRegistry (no ONCHAINID, no claims)
**Country:** 840 (US) — but this doesn't matter since not registered
**CPC Balance:** 0
**eUSD Balance:** 10,000.00

### / (Investor Portal)

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Connect wallet | Shows "Bob" label | None |
| ComplianceStatus | (1) FAIL: "No identity found". (2) FAIL: "Not registered". (3) FAIL: "Not registered". (4) FAIL: "Not registered". → **"Not Eligible"** | **Correct behavior.** Bob is unverified and correctly blocked. |
| Purchase form | Disabled — "must pass all compliance checks" message, input and button greyed out | Correct |
| Portfolio | CPC: 0. eUSD: 10,000.00 | Correct |

**Note:** Bob's ComplianceStatus short-circuits after check 1 fails. Checks 2-4 are set to "fail" with "Not registered" without making contract calls. This is by design (`ComplianceStatus.tsx:45-53`).

### /issue — Same as Alice (all reverts)
### /monitor — Works fine

---

## Charlie — Restricted Country — `0xFf3a3D1fEc979BB1C6b3b368752b61B249a76F90`

**Account ID:** 0.0.8214051
**Role:** None
**Identity:** Registered, ONCHAINID deployed, all 3 claims issued
**Country:** 156 (China — restricted by CountryRestrictModule)
**CPC Balance:** 0
**eUSD Balance:** 10,000.00

### / (Investor Portal)

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Connect wallet | Shows "Charlie" label | None |
| ComplianceStatus | (1) PASS: "ONCHAINID linked". (2) PASS: "All claims verified". (3) **FAIL: "China - Restricted"**. (4) **FAIL: "Transfer blocked by compliance"**. → **"Not Eligible"** | **Correct behavior.** Charlie has valid identity and claims but is in a restricted country. Both the jurisdiction check AND compliance module correctly identify this. |
| Purchase form | Disabled | Correct |

**Important for demo:** Charlie demonstrates that even a fully KYC'd investor can be blocked by jurisdiction rules. This is a key ERC-3643 compliance feature. The fact that both check 3 (jurisdiction label) AND check 4 (on-chain compliance) fail shows the system works end-to-end.

### /issue — Same as Alice/Bob
### /monitor — Works fine

---

## Diana — Freeze Demo — `0x35bccFFf4fCaFD35fF5b3c412d85Fba6ee04bCdf`

**Account ID:** 0.0.8214895
**Role:** None
**Identity:** Registered, ONCHAINID deployed, all 3 claims issued
**Country:** 250 (France)
**CPC Balance:** 0
**eUSD Balance:** 10,000.00

### / (Investor Portal) — Default State (not frozen)

| Action | Expected Result | Issues |
|--------|----------------|--------|
| Connect wallet | Shows "Diana" label | None |
| ComplianceStatus | (1) PASS (2) PASS (3) PASS "France - Approved" (4) PASS "Transfer permitted" → **"Eligible to Invest"** | None |
| Purchase | Same as Alice — **Step 4 FAILS** (not agent) | Same critical bug |

### / (Investor Portal) — After Being Frozen by Deployer

| Action | Expected Result | Issues |
|--------|----------------|--------|
| ComplianceStatus (already loaded) | Still shows old "Eligible" state until page refresh or account re-connect | **STALE** — compliance checks don't re-run after freeze |
| Refresh page / re-connect | ComplianceStatus re-runs: (1) PASS (2) PASS (3) PASS (4) **FAIL: "Transfer blocked by compliance"** → "Not Eligible" | `canTransfer` correctly returns false for frozen addresses |
| Purchase button | Disabled | Correct |

### Freeze/Unfreeze Demo Flow (requires 2 browser sessions or wallet switching)

1. **Deployer** at /issue: Enter Diana's address → Freeze → Success
2. **Diana** at /: Refresh page → "Not Eligible" (check 4 fails)
3. **Deployer** at /issue: Enter Diana's address → Unfreeze → Success
4. **Diana** at /: Refresh page → "Eligible to Invest" (check 4 passes again)

**Demo note:** This flow requires either two browser windows with different wallets or wallet switching in MetaMask. The E2E tests handle this by injecting different wallet mocks per test.

---

## Cross-Persona Summary Table

| Flow | Deployer | Alice | Bob | Charlie | Diana |
|------|----------|-------|-----|---------|-------|
| Compliance checks | 4/4 PASS | 4/4 PASS | 0/4 PASS (short-circuits) | 2/4 PASS | 4/4 PASS (unless frozen) |
| Eligible to invest | Yes | Yes | No | No | Yes (unless frozen) |
| Purchase completes | **Yes (misleading)** | **NO (reverts)** | N/A (blocked) | N/A (blocked) | **NO (reverts)** |
| Issuer mint | Works | Reverts | Reverts | Reverts | Reverts |
| Issuer freeze | Works | Reverts | Reverts | Reverts | Reverts |
| Issuer pause | Works | Reverts | Reverts | Reverts | Reverts |
| View compliance monitor | Works | Works | Works | Works | Works |

---

## Critical Demo Script Issues

### Issue 1: The Happy Path is Broken
The single most important demo scenario — "verified investor buys green bonds" — fails at the final step. A judge following the natural flow (connect as Alice → see "Eligible" → enter amount → click Purchase) will watch 3 steps succeed then see a red error on step 4. This is the worst possible impression.

### Issue 2: Deployer Success is Misleading
The deployer can complete a purchase because they happen to be a token agent. If a demo video shows the deployer purchasing, it looks like the flow works. But if a judge tries it with a different wallet, it breaks. This creates a credibility gap.

### Issue 3: eUSD Balance Never Changes
After any "purchase" (even deployer's successful one), the eUSD balance stays at its original value. A judge watching the portfolio section will notice: "I bought 100 CPC but my eUSD didn't decrease?" This undermines the legitimacy of the flow.

### Issue 4: Compliance Status Doesn't Auto-Refresh
If Diana gets frozen while viewing her portal, she still sees "Eligible to Invest" until page refresh. In a live demo, this means the freeze effect isn't visible without manually refreshing.

### Issue 5: No Feedback for Non-Authorized Issuer Actions
Alice at /issue sees all controls. Clicking any of them produces a raw blockchain error. The error messages are technical (`AgentRole: caller does not have the Agent role`) and get truncated. A better UX would be to check the role first and show "Only the bond issuer can perform this action."

### Issue 6: Impact Topic Dead End
The "Use of Proceeds" section and "Allocate to HCS" button form a dead loop: the button doesn't write to HCS, so the chart never has data. In a demo, this entire feature appears non-functional.
