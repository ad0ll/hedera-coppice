# Coppice -- Pitch Deck

**Track:** Sustainability
**Hackathon:** Hedera Hello Future: Apex 2026

---

## Slide 1: Title

**Coppice**
*Green Bonds with Teeth on Hedera*

ad0ll (solo developer) | Live at coppice.cc | Sustainability Track

*Presenter note: Open with — "Coppice is the first on-chain instrument combining green bond use-of-proceeds tracking with sustainability-linked coupon penalties — built on Hedera."*

---

## Slide 2: The Problem

### The Green Investment Trust Gap

The world needs **$7.5 trillion/year** in green investment by 2030 for net-zero [CBI]. We're at **$600 billion** — 8% of the target.

The gap isn't capital. It's trust. Green bonds have crossed **$3 trillion outstanding** [LSEG], but four structural failures undermine confidence:

1. **Self-certified "green"** — Issuers self-report with minimal external verification. 94% of investors believe sustainability reporting contains unsupported claims [PwC 2023]. The EU Green Bond Standard (Dec 2024) is voluntary — only ~30 of thousands of green bonds have adopted it [IEEFA, Feb 2026].

2. **Opaque fund tracking** — Investors can't verify where funds went until the issuer publishes an annual report — self-authored, unverified, often 12+ months late.

3. **Off-chain compliance** — KYC/AML and jurisdiction checks live in spreadsheets. Transfer restrictions are voluntary, not protocol-level.

4. **No consequences for missing targets** — Green bonds have zero financial penalty for greenwashing. Sustainability-linked bonds (SLBs) penalize with coupon step-ups, but don't track where funds go. No on-chain instrument combines both accountability and incentives.

*Presenter note: 80% of Gen Z and millennials plan to increase sustainable allocations this year, but greenwashing is cited as the #1 barrier by 70% of investors across all age groups [Morgan Stanley 2025]. The demand exists — the trust infrastructure doesn't.*

---

## Slide 3: The Solution

### Two Instruments, Combined On-Chain for the First Time

Coppice combines two financial structures that have never been combined on-chain:

**Green Bond (use-of-proceeds & MRV)**
Every fund allocation is a Guardian Verifiable Credential — recorded in real-time, anchored to HCS, stored on IPFS. Investors verify the full trust chain (project registration → allocation → MRV report → independent verification) without waiting for annual PDFs.

**Sustainability-Linked Bond (coupon penalty)**
The bond defines a Sustainability Performance Target: "Avoid 10,000 tCO2e per coupon period." If verified MRV data falls short, the coupon rate steps up +25bps (4.25% → 4.50%). If climate targets aren't met, the coupon rate increases automatically — creating direct financial consequences for environmental underperformance. The issuer cannot override the penalty.

**Protocol-level compliance**
ATS enforces identity, KYC, AML, accredited investor status, jurisdiction, and transfer eligibility in the token contract. Non-compliant wallets cannot receive tokens.

Verbund issued the first hybrid green+SLB in traditional finance (EUR 500M, 2021) [Natixis]. Coppice is the first on-chain implementation.

*Presenter note: Each problem from Slide 2 maps to a solution — #1 → Guardian VCs with independent verification, #2 → real-time use-of-proceeds tracking, #3 → ATS on-chain compliance, #4 → SPT coupon penalty. Call this out explicitly.*

---

## Slide 4: How It Works

*Presenter note: This slide is a simplified visual flow. Lay out as a horizontal pipeline with Hedera service labels. Not a code diagram — a process diagram suitable for a non-technical audience.*

**Flow:**

Investor connects wallet → **ATS compliance checks** (identity, KYC/AML, accredited, jurisdiction, transfer eligibility) → Purchase with eUSD → **Proceeds allocated** to green projects (Guardian VC) → **MRV reports** submitted → **Independent verification** → **SPT check** → Coupon rate set (base or penalty)

**5 Hedera services powering the flow:**

| Service | Role in Coppice |
|---------|----------------|
| **Asset Tokenization Studio (ATS)** | Bond deployed as single EVM contract with compliance, KYC, coupon management built in. LifeCycleCashFlow for automated coupon distribution via on-chain snapshots. |
| **Guardian** | 5 ICMA-aligned VC schemas: bond framework, project registration, fund allocation, MRV report, verification statement. VCs anchored to HCS for tamper-proof audit trail. |
| **Hedera Consensus Service (HCS)** | Immutable audit trail — Guardian anchors all VCs to HCS topics. On-chain events timestamped and publicly queryable. |
| **Mirror Node** | Primary frontend data source — contract event logs, HTS balance queries, transaction verification. |
| **Hedera Token Service (HTS)** | *(Hackathon only)* eUSD stablecoin settlement — testnet stand-in for USDC. ERC-20 facade via HIP-218. |

*Presenter note: Key callout for the diagram — "If verified CO2e misses target, coupon steps up. The API blocks creation below the penalty rate — Guardian must be reachable and SPT must be checked."*

---

## Slide 5: Live Demo

**Demo Video:** [YouTube](https://youtu.be/261J4n4K3t8)
**Live App:** https://www.coppice.cc
**Guardian API:** https://guardian.coppice.cc
**CPC Bond:** `0.0.8254921` — importable in Hedera's testnet Tokenization Studio

### Live on Hedera testnet:

| Page | What it shows |
|------|--------------|
| **Invest** | Real-time compliance verification. Alice passes all checks, purchases CPC with eUSD. Bob eligible via self-promotion (judge onboarding). Charlie blocked — restricted jurisdiction enforced at protocol level. |
| **Coupons** | Coupon schedule — 4.25% annual rate, face value, record/execution dates, on-chain snapshot status. |
| **Impact** | Guardian-verified projects with full trust chain (IPFS + HCS links). SPT target vs actual. ICMA compliance evidence. |
| **Issuer** | Issue tokens, freeze/unfreeze, pause/unpause, allocate proceeds via Guardian, distribute coupons, register new projects. |

Every action is a real Hedera testnet transaction. Every HashScan and IPFS link is clickable and verifiable.

78% test coverage (220+ tests) | WCAG 2.1 AA accessible | Mobile responsive

---

## Slide 6: The Hybrid — Green Bond + Sustainability-Linked Bond

### Green Bond Side — Use of Proceeds & MRV

Use-of-proceeds tracked as **Guardian Verifiable Credentials**. Each step independently verifiable via IPFS + HCS:

| VC Type | GBP Component | What It Records |
|---------|---------------|----------------|
| **Bond Framework** | Project Evaluation & Selection | Eligible ICMA categories, SPT target, coupon terms |
| **Project Registration** | Project Evaluation & Selection | Name, ICMA category, location, EU Taxonomy alignment |
| **Fund Allocation** | Use of Proceeds + Management | Amount, purpose, Hedera tx ID — on-chain cross-ref |
| **MRV Report** | Reporting (ICMA Harmonised Framework) | tCO2e avoided, MWh generated, methodology |
| **Verification** | External Review | Independent verifier (separate DID) confirms impact |

### SLB Side — Consequences for Missing Targets

Sustainability Performance Target ties the coupon rate to **verified MRV data** from the green bond side:

**SPT:** "Avoid 10,000 tCO2e per coupon period across all funded projects."

- **Target met:** Coupon stays at 4.25%
- **Target missed:** Coupon steps up to 4.50% (+25bps)

**Hard-gated:** Verified Guardian MRV data determines the coupon rate. If climate targets are missed, the rate steps up automatically. Coupons are distributed on-chain via ATS at the verified rate — the issuer cannot override the penalty.

### The Bridge

MRV reports (green bond) feed directly into the SPT check (SLB). Guardian is both the evidence chain for investors *and* the enforcement mechanism for coupon penalties. Miss the environmental target → pay more interest. No other on-chain instrument does both.

*Presenter note: This slide shows HOW the hybrid works mechanically. Left column = green bond (tracking). Right column = SLB (consequences). The green card at the bottom connects them — MRV feeds SPT. Call this out explicitly.*

---

## Slide 7: Why Hedera

### ATS: Compliance in a Single Contract

ATS deploys the bond as a single contract with compliance, KYC/AML, jurisdiction controls, whitelist enforcement, and coupon management built in. Non-compliant transfers revert at the protocol level.

### Guardian: Open-Source dMRV & Policy Engine

World's largest open-source digitized climate methodology library. Converts environmental compliance standards into **programmable policy-as-code** — CDM, GHGP, Gold Standard, Verra, iREC methodologies all represented. Automates measurement, reporting, and verification as auditable VCs anchored to HCS + IPFS.

### Ecosystem Validation

- **ERC-3643 Association** — DTCC, ABN AMRO, Deloitte, Fireblocks, Hedera Foundation. $32B+ tokenized using this standard. [ERC-3643 Association, March 2025]
- **Verra** (1.3B+ tonnes verified) — 5-year partnership with Guardian to digitalize 20+ carbon methodologies. First standards body to integrate with blockchain MRV. [Verra, May 2025]

### Carbon-Negative Network

Only major L1 verified by UCL as the lowest-energy DLT studied [UCL]. **0.000003 kWh per transaction.** Quarterly carbon offsets via Terrapass make the network carbon-negative. A green bond should run on a green chain.

### Growing dMRV Ecosystem

Coppice's manual MRV is a stepping stone to automated verification. The ecosystem is already building: **HYPHEN** flux towers measure GHG concentrations every 10 seconds on Hedera [HYPHEN]. **B4E** (Chevron, ExxonMobil, Repsol, ConocoPhillips) joined the Hedera Council in June 2025 for energy sector dMRV [Hedera, June 2025].

---

## Slide 8: Validation & Regulatory Pathway

### Institutional Precedent

| Deployment | Details | What Coppice Adds |
|-----------|---------|-------------------|
| **ABN AMRO** (Sept 2023) | EUR 5M digital green bond on Polygon. ERC-3643 + Tokeny. [Tokeny] | Guardian-verified impact + SPT penalties on carbon-negative chain |
| **HKSAR** (Feb 2023) | HK$800M tokenized government green bond. T+1 settlement. [CoinTelegraph] | On-chain compliance + use-of-proceeds tracking |
| **BIS Project Genesis** (2022) | Green bond prototype with IoT-based ESG tracking. [BIS] | Production implementation of real-time MRV verification |
| **30+ EuGBs** (since Dec 2024) | EUR 30B+ issued under EU Green Bond Standard. First by A2A (Jan 2025), largest by EIB (EUR 3B). [IEEFA] | On-chain enforcement of the same transparency principles |

### Regulatory Pathway for Coppice

**EU Green Bond Standard** (Reg. 2023/2631, effective Dec 2024) — Demands taxonomy-aligned use-of-proceeds and external review. Coppice's 5 Guardian VCs map directly to the 4 GBP core components — delivering digitally and in real-time what the standard requires as annual PDFs. [EC]

**30+ EuGBs already issued** — EUR 30B+ issued under EuGBS since Dec 2024. The standard is gaining traction — Coppice provides the on-chain infrastructure to meet its transparency requirements natively. [IEEFA]

**EU DLT Pilot Regime** (Reg. 2022/858) — Bonds under EUR 1B can be issued on DLT within a regulatory sandbox. ESMA review delivered March 2026; Commission signaled no expiry. This is the concrete legal pathway for Coppice to issue tokenized bonds in the EU without new legislation. [EUR-Lex]

---

## Slide 9: Roadmap

### What's Built

- Hybrid green bond + sustainability-linked bond on Hedera testnet — the first on-chain implementation combining use-of-proceeds tracking with sustainability-linked coupon penalties
- Full frontend with investor portal, coupon schedule, impact tracking, and issuer dashboard
- 5 Hedera services: Smart Contracts (ATS), Guardian, HCS, HTS, Mirror Node
- Guardian integration: 5 ICMA-aligned VC schemas, trust chain visualization, SPT enforcement
- Automated coupon distribution via LifeCycleCashFlow (on-chain snapshot + mass payout)
- 78% test coverage (220+ tests: 32 contract + 119 unit + 69 E2E)
- Live at https://www.coppice.cc + https://guardian.coppice.cc

### What's Next

| Phase | Milestone |
|-------|-----------|
| **Institutional Pilot** | Partner with a green bond issuer for testnet/mainnet pilot |
| **EU DLT Pilot Regime** | Apply under Reg. 2022/858 — bonds under EUR 1B qualify for DLT sandbox. Concrete legal pathway to mainnet issuance. [EUR-Lex] |
| **Automated dMRV** | Integrate IoT/satellite data via Guardian — HYPHEN and B4E show this is production-ready on Hedera |
| **Multi-bond Platform** | Multiple issuers, independent compliance rules, secondary market trading |

### Key Learnings

- **ATS is bond-ready.** Coupon scheduling, snapshots, and mass distribution via LifeCycleCashFlow work end-to-end — but required reading contract source directly. First bond implementation on ATS.
- **Guardian extends beyond carbon credits.** Its VC + HCS + IPFS architecture is a natural fit for bond use-of-proceeds tracking. We built 5 ICMA-aligned schemas from scratch — the methodology library doesn't cover bonds yet, but the infrastructure supports it.
- **The combination is novel and viable.** No shared documentation between ATS and Guardian — bridging them required mapping undocumented role hashes and adapting Guardian's carbon credit workflows for bond schemas. The result validates the architecture.

---

## Sources

- [CBI] Climate Bonds Initiative. "Global State of the Market 2024." https://www.climatebonds.net/
- [LSEG] LSEG. "Green Debt Market Passes $3 Trillion Milestone." 2025. https://www.lseg.com/en/insights/green-debt-market-passes-3-trillion-milestone
- [PwC 2023] PwC. "2023 Global Investor Survey." https://www.pwc.com/gx/en/news-room/press-releases/2023/pwc-2023-global-investor-survey.html
- [Morgan Stanley 2025] Morgan Stanley. "Sustainable Signals — Individual Investors 2025." https://www.morganstanley.com/insights/articles/sustainable-investing-interest-2025
- [EC] European Commission. "European Green Bond Standard." Regulation (EU) 2023/2631. https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/european-green-bond-standard-supporting-transition_en
- [IEEFA] IEEFA. "First Year of European Green Bond Standard Sets Stage for Growth." Feb 2026. https://ieefa.org/articles/first-year-european-green-bond-standard-sets-stage-growth
- [EUR-Lex] EUR-Lex. "Regulation (EU) 2022/858 — DLT Pilot Regime." https://eur-lex.europa.eu/eli/reg/2022/858/oj/eng
- [ERC-3643 Association] ERC-3643 Association. "24 New Members." March 2025. https://www.erc3643.org/news/erc3643-association-welcomes-24-new-members-to-advance-the-institutional-tokenization-standard
- [UCL] UCL Centre for Blockchain Technologies. "Hedera Energy Study." https://hedera.com/ucl-blockchain-energy
- [Verra] Verra. "Verra and Hedera to Accelerate Digital Transformation of Carbon Markets." May 2025. https://verra.org/verra-and-hedera-to-accelerate-digital-transformation-of-carbon-markets/
- [HYPHEN] HYPHEN. "Hyphen Joins Hedera Guardian Ecosystem." https://www.hyphen.earth/post/hyphen-joins-hedera-guardian-ecosystem-to-develop-new-dmrv-methodologies
- [Hedera, June 2025] Hedera. "B4E Joins Hedera Council." https://hedera.com/blog/blockchain-for-energy-b4e-joins-hedera-council-to-advance-emissions-reporting-standards/
- [Tokeny] Tokeny. "ABN AMRO Success Story." https://tokeny.com/success-story-abn-amros-bond-tokenization-on-polygon/
- [CoinTelegraph] CoinTelegraph. "Hong Kong Government Issues $800M Tokenized Green Bond." Feb 2023.
- [BIS] BIS Innovation Hub. "Project Genesis." https://www.bis.org/about/bisih/topics/green_finance/green_bonds.htm
- [Natixis] Natixis. "Verbund issues world's first bond combining Use-of-Proceeds and KPI-linking." https://gsh.cib.natixis.com/our-center-of-expertise/articles/verbund-issues-world-s-first-bond-combining-use-of-proceeds-earmarking-and-kpi-linking-mechanism
