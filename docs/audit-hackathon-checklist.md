# Hackathon Judging Criteria Checklist

Hello Future Apex Hackathon 2026 — DeFi & Tokenization Track ($40,000 prize pool)
Submission deadline: March 23, 2026, 11:59 PM ET

---

## 1. Innovation (10%) — Alignment, uniqueness, ecosystem advancement

| Criterion | Status | Evidence | Risk |
|-----------|--------|----------|------|
| Aligns with DeFi & Tokenization track focus | PASS | ERC-3643 security token + tokenized green bonds | None |
| Uses Hedera in a novel way | PASS | First ERC-3643 green bond on Hedera with HCS audit trail | None |
| Combines multiple Hedera services | PASS | EVM + HCS + HTS + Mirror Node | None |
| Advances the Hedera ecosystem | PASS | Demonstrates institutional DeFi compliance pattern | None |
| Impact reporting concept | PARTIAL | Architecture exists (HCS impact topic, ICMA categories in UI) but no actual impact data submitted | **Risk:** The innovation story includes impact reporting but the demo can't show it working |

**Score risk: LOW.** The concept is strong. ERC-3643 + green bonds + Hedera is genuinely novel.

---

## 2. Feasibility (10%) — Technical viability and team capability

| Criterion | Status | Evidence | Risk |
|-----------|--------|----------|------|
| Smart contracts compile | PASS | Hardhat compilation succeeds | None |
| Contracts deploy to testnet | PASS | All T-REX suite + 3 compliance modules + ClaimIssuer deployed | None |
| 32 contract unit tests | PASS | Hardhat tests passing | None |
| 18 E2E tests | PASS | Playwright tests passing (including write operations) | None |
| Frontend builds | PASS | `tsc -b && vite build` succeeds with 0 errors | None |
| Middleware runs | PASS | Event logger, HCS setup, HTS setup all functional | None |

**Score risk: LOW.** Strong technical foundation.

---

## 3. Execution (20%) — MVP/PoC delivery, team dynamics, GTM strategy

This is the highest-weighted criterion (tied with Success at 20%). This is where we have the biggest gaps.

| Criterion | Status | Evidence | Risk |
|-----------|--------|----------|------|
| Working MVP | **PARTIAL** | Core compliance + identity + monitoring works. **Purchase flow broken** for investors. Proceeds allocation simulated. | **HIGH RISK.** 20% of score. |
| End-to-end flow works | **FAIL** | Deployer can complete purchase (misleading). Alice, Diana cannot. | Critical |
| **Demo video (max 5 min, YouTube)** | **MISSING** | Not created yet. | **BLOCKING: No video = not scored at all** |
| **Pitch deck (PDF)** | **MISSING** | Not created yet. | Required artifact |
| **Live demo URL** | **MISSING** | Vercel config exists, not deployed. | Required artifact |
| GTM strategy | N/A | Needs pitch deck to present | Covered by pitch |

**Score risk: VERY HIGH.** Missing video means 0 points across ALL criteria. Even with video, broken purchase flow undermines the demo.

---

## 4. Integration (15%) — Hedera network usage depth and creativity

This criterion specifically evaluates how deeply and creatively we use Hedera's services. Judges will probe.

### Hedera Service Usage Map

| Service | Used | Depth Rating | What Works | What Doesn't |
|---------|------|-------------|------------|-------------|
| **EVM / Smart Contracts** | Yes | **Deep** | Full T-REX ERC-3643 suite: Token, IdentityRegistry, ModularCompliance, TrustedIssuersRegistry, ClaimTopicsRegistry, IdentityRegistryStorage, ClaimIssuer, plus 3 compliance modules (CountryRestrict, MaxBalance, SupplyLimit). OnchainID infrastructure (Identity, IdentityProxy, ImplementationAuthority, Factory). ~20 deployed contracts. | Contracts **not verified** on HashScan. A judge clicking a contract address sees "Contract bytecode" with no source. |
| **HCS (Consensus Service)** | Yes | **Medium** | 2 topics created (audit + impact). Audit topic has real events from event-logger. Frontend reads events via Mirror Node. Filter/display working. | Impact topic is **empty** (0 messages). Proceeds allocation is simulated. Event logger must be running for new events. |
| **HTS (Token Service)** | Yes | **Shallow** | eUSD token created, 4 wallets associated, balances distributed and displayed. | eUSD is **never transferred** during purchase. No HTS system contract or SDK call in the purchase flow. The token exists but isn't functionally used beyond showing a balance. |
| **Mirror Node REST API** | Yes | **Medium** | HCS message polling (5s), eUSD balance queries (2-step: address resolve + token balance), account resolution. | No pagination for >100 HCS messages. |
| **JSON-RPC Relay (Hashio)** | Yes | **Medium** | All contract reads/writes via public Hashio endpoint. Chain switching for MetaMask. | No private relay or rate limit handling for production. |
| **HashScan Verification** | **No** | **None** | N/A | Plugin not installed. No contracts verified. |
| **Hedera Guardian** | No | N/A | N/A | Could strengthen sustainability narrative |
| **Scheduled Transactions** | No | N/A | N/A | Could be used for coupon payments |
| **Smart Contract Service (precompiles)** | No | N/A | N/A | HTS precompile (0x167) could enable in-browser eUSD transfers |

### Integration Depth Assessment

**Current: Weak-Medium.** We use 5 Hedera services, but:
- HTS depth is shallow (token exists, isn't transacted)
- HCS impact topic is empty
- No contract verification
- Event logger is a separate process that must be running

**To reach Strong:**
1. Make eUSD transfer real (either via HTS system contract precompile `0x167` in browser, or via backend API using Hedera SDK)
2. Submit actual proceeds allocation events to HCS impact topic
3. Verify all contracts on HashScan
4. Ensure event-logger is running during demo

**Score risk: MEDIUM-HIGH.** The shallow HTS usage and empty impact topic are noticeable gaps.

---

## 5. Success (20%) — Ecosystem impact, user adoption potential

| Criterion | Status | Evidence | Risk |
|-----------|--------|----------|------|
| Solves real problem | PASS | Green bond compliance + transparent impact tracking | None |
| Market validation | PASS | ABN AMRO EUR 5M green bond (ERC-3643 on Polygon, Sept 2023) | Strong precedent |
| $5T+ green bond market | PASS | ICMA GBP alignment, growing market | None |
| User-friendly interface | PASS | Clean institutional dark theme, responsive, clear compliance flow | None |
| Scalability | PASS | T-REX factory pattern, modular compliance, configurable countries/limits | None |
| Hedera advantages clear | PARTIAL | Low cost, fast finality, HCS audit trail | Should articulate in pitch: why Hedera > Ethereum/Polygon for this use case |

**Score risk: LOW.** The market story is strong.

---

## 6. Validation (15%) — Market feedback and traction evidence

| Criterion | Status | Evidence | Risk |
|-----------|--------|----------|------|
| Regulatory alignment | PASS | ERC-3643 is backed by HBAR Foundation, Tokeny, EU regulation | Strong |
| Standard compliance | PARTIAL | ICMA categories in UI, but no actual impact metrics | Could be stronger |
| Working testnet deployment | PASS | All contracts deployed, demo wallets configured | None |
| Test coverage | PASS | 50 tests (32 Hardhat + 18 Playwright) | Good |
| External validation | PARTIAL | ABN AMRO precedent, Hedera ATS partnership | Need to articulate in pitch |

**Score risk: LOW-MEDIUM.**

---

## 7. Pitch (10%) — Clarity, narrative, metrics communication

| Criterion | Status | Evidence | Risk |
|-----------|--------|----------|------|
| Demo video (max 5 min) | **MISSING** | Must create and upload to YouTube | **REQUIRED FOR SCORING** |
| Pitch deck (PDF) | **MISSING** | Must create with: team intro, solution summary, roadmap, demo link | Required |
| Project description (max 100 words) | **MISSING** | For StackUp submission form | Required |
| Tech stack documentation | PARTIAL | README exists but needs review | Low risk |
| Clear narrative | TBD | Depends on pitch deck quality | |

**Score risk: HIGH.** All deliverables missing.

---

## Priority Actions (Ranked by Point Impact)

### Tier 0: Existential (blocks all scoring)

| # | Action | Why | Score Impact |
|---|--------|-----|-------------|
| 1 | **Create demo video** (user-driven) | No video = 0 points. Not scored at all. | ALL 100% |
| 2 | **Deploy to Vercel** (live demo URL) | Required submission artifact | Execution 20% |
| 3 | **Create pitch deck** (user-driven) | Required submission artifact | Pitch 10% |

### Tier 1: Critical Bugs (lose major points if not fixed)

| # | Action | Why | Score Impact |
|---|--------|-----|-------------|
| 4 | **Fix purchase flow** — implement backend mint + real eUSD transfer | Primary demo flow is broken. Judges WILL try this. | Execution 20% + Integration 15% |
| 5 | **Verify contracts on HashScan** | Judges will click contract links. Unverified = incomplete. | Integration 15% |

### Tier 2: Significant Improvements (noticeable score gains)

| # | Action | Why | Score Impact |
|---|--------|-----|-------------|
| 6 | **Submit impact events to HCS** | Empty impact topic weakens green bond narrative. | Integration 15% + Innovation 10% |
| 7 | **Role-based UI on Issuer Dashboard** | Non-deployer sees confusing errors. | Execution 20% |
| 8 | **Ensure event-logger is running** | No audit events = compliance monitor looks dead. | Integration 15% |
| 9 | **Refresh stale data** (supply, paused, compliance after freeze) | Stale data visible during demo. | Execution 20% |

### Tier 3: Polish (marginal points)

| # | Action | Why | Score Impact |
|---|--------|-----|-------------|
| 10 | Add ICMA impact metrics to impact events | Strengthens innovation/validation narrative | Innovation 10% + Validation 15% |
| 11 | Fix provider singleton | Code quality | Execution 20% (minor) |
| 12 | Paginate HCS messages (>100) | Robustness | Integration 15% (minor) |
| 13 | Cache Mirror Node account ID resolution | Performance | Integration 15% (minor) |

---

## Submission Checklist (StackUp Platform)

- [ ] GitHub repo URL (public, with code + README + deployment files)
- [ ] Project description (max 100 words)
- [ ] Track selection: DeFi & Tokenization
- [ ] Tech stack listed: Solidity, ERC-3643/T-REX, Hardhat, React, Vite, Tailwind CSS, ethers.js, Hedera SDK, HCS, HTS, Playwright
- [ ] Pitch deck PDF: team intro, solution summary, competitive landscape, roadmap, demo link
- [ ] Demo video URL (YouTube, max 5 min) — **REQUIRED FOR SCORING**
- [ ] Live demo URL (Vercel)
- [ ] Complete compulsory feedback questions (allow 1 hour before deadline)
- [ ] Deadline: March 23, 2026, 11:59 PM ET

---

## Demo Video Script Outline (suggested)

1. **Intro** (30s): Problem statement — green bonds need compliance + transparency
2. **Architecture** (45s): Diagram showing ERC-3643 + HCS + HTS on Hedera
3. **Compliance Demo** (60s): Connect as Alice (eligible), Bob (blocked), Charlie (restricted)
4. **Purchase Flow** (60s): Alice buys bonds — show all 4 steps completing
5. **Issuer Controls** (45s): Connect as deployer — mint, freeze Diana, pause token
6. **Compliance Monitor** (30s): Show real HCS audit events with filters
7. **Impact Tracking** (30s): Show use-of-proceeds chart with allocation data
8. **Why Hedera** (30s): Low fees, HCS for audit trails, HTS for stablecoin, fast finality
