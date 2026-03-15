# Coppice -- Pitch Deck

**Track:** DeFi & Tokenization (primary) / Sustainability (alternate)
**Hackathon:** Hedera Hello Future: Apex 2026

---

## Slide 1: Title

**Coppice**
*Compliant Green Bond Tokenization on Hedera*

- Solo developer project
- DeFi & Tokenization track
- ERC-3643 + Hedera Consensus Service + Hedera Token Service

Named after the ancient woodland management technique where trees are sustainably harvested and regrow -- a metaphor for sustainable finance.

---

## Slide 2: The Problem

### Green Bonds Have a Trust Problem

The green bond market has crossed **$3 trillion outstanding** [1] and issued a record **$572 billion in 2024** [2], but three structural failures undermine investor confidence:

1. **Greenwashing risk** -- Issuers self-certify bonds as "green" with minimal external verification. The EU Green Bond Standard (effective Dec 2024) [3] exists, but only 3 issuers have adopted it so far [4].

2. **Opaque fund tracking** -- Use-of-proceeds reports arrive 12+ months late as static PDFs. Investors have no real-time visibility into whether funds actually reach green projects.

3. **Compliance fragmentation** -- KYC/AML and jurisdiction checks happen off-chain in spreadsheets, with no on-chain enforcement. Transfer restrictions are voluntary, not protocol-level.

**The gap:** The Climate Bonds Initiative estimates **$7.5 trillion per year** in green investment is needed by 2030 for net-zero [5]. At $600B/year, we're at 8% of the target. Closing this gap requires trust infrastructure that scales.

---

## Slide 3: The Solution

### Coppice: Institutional-Grade Green Bond Compliance on a Carbon-Negative Chain

Coppice tokenizes green bonds using **ERC-3643** (the institutional standard for security tokens, with **$32B+ in tokenized assets** [6]) on **Hedera** (the only major L1 that is **carbon-negative** [7]).

**Three core capabilities:**

| Capability | How | Hedera Service |
|-----------|-----|----------------|
| **Protocol-level compliance** | ERC-3643 enforces identity verification, KYC/AML claims, and jurisdiction checks in the token contract itself. Non-compliant transfers revert. | Smart Contracts (Hedera EVM) |
| **Immutable audit trail** | Every mint, transfer, freeze, and pause is logged to an append-only HCS topic. Regulators and investors verify the same record. | Hedera Consensus Service |
| **On-chain use-of-proceeds** | Fund allocations to green projects are recorded to HCS with category, amount, and timestamp. No more waiting for annual PDF reports. | Hedera Consensus Service |
| **Stablecoin settlement** | Bond purchases settle in eUSD, a native HTS fungible token with ERC-20 facade via HIP-218. | Hedera Token Service |

**What this is NOT:** A wrapper around an ERC-20 with optional compliance. ERC-3643 bakes compliance into the transfer function. You physically cannot send tokens to a non-compliant address.

---

## Slide 4: Architecture

```
                           +---------------------------+
                           |     Next.js 16 Frontend    |
                           |  Investor | Issuer | Audit  |
                           |  wagmi v3 + viem v2         |
                           +--+----------+----------+---+
                              |          |          |
               +--------------+   +------+------+  +-------------+
               |                  |             |                |
   +-----------v-----------+  +---v-----------+ +--v-----------+ |
   | Smart Contracts (EVM) |  | HCS Topics    | | HTS Tokens   | |
   | ERC-3643 T-REX v4.1.6 |  | Audit Trail   | | eUSD (settle)| |
   | Token + Identity +    |  | Impact Track  | |              | |
   | Compliance + Claims   |  |               | |              | |
   +-----------------------+  +-------+-------+ +---------+----+ |
                                      |                   |      |
                              +-------v-------------------v------v+
                              |        Mirror Node REST API        |
                              |  HCS messages | HTS balances |     |
                              |  Account lookup | Tx verify  |     |
                              +------------------------------------+
```

### 4 Hedera Services

1. **Smart Contracts** -- 12 ERC-3643 contracts: Token, IdentityRegistry, IdentityRegistryStorage, ClaimTopicsRegistry, TrustedIssuersRegistry, ModularCompliance, ClaimIssuer, 3 compliance modules, OnchainID infrastructure
2. **Hedera Consensus Service** -- 2 topics: compliance audit trail + green impact tracking
3. **Hedera Token Service** -- eUSD stablecoin (FungibleCommon, 2 decimals) for bond settlement
4. **Mirror Node API** -- HCS event feed, HTS balance queries, account ID mapping, transaction verification

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Contracts | Solidity 0.8.17, T-REX v4.1.6, OnchainID v2.0.0, OpenZeppelin v4.9.6 |
| Frontend | Next.js 16, React 19, wagmi v3, viem v2, Tailwind CSS v4 |
| Backend | Next.js API routes (purchase + allocate), Hedera SDK |
| Services | Event logger daemon (EVM events -> HCS) |
| Testing | Hardhat (contracts), vitest (frontend), Playwright (E2E) |
| Build | Turborepo monorepo, TypeScript throughout |

---

## Slide 5: Live Demo

**Demo Video:** [YouTube link -- embed here]
**Live App:** [Vercel URL -- embed here]

### What the demo shows:

| Scene | What happens | Criteria hit |
|-------|-------------|-------------|
| Alice connects | 4 real-time compliance checks pass, purchase flow executes | Execution, Integration |
| Bob connects | No identity -- blocked immediately | Execution |
| Charlie connects | Identity verified, China restricted -- blocked at compliance | Execution, Innovation |
| Issuer mints | 100 CPC minted to Alice, real testnet tx | Execution, Success |
| Issuer freezes Diana | Wallet frozen/unfrozen, real testnet tx | Execution, Feasibility |
| Issuer allocates proceeds | $250K to "Nordic Wind Farm" recorded to HCS | Innovation, Integration |
| Compliance Monitor | HCS audit feed with HashScan links to real transactions | Integration, Success |

Every action in the demo is a real Hedera testnet transaction. Every HashScan link is clickable and verifiable.

---

## Slide 6: Compliance Deep-Dive

### ERC-3643: The Four-Gate Transfer Model

```
  Investor connects wallet
         |
         v
  +------+-------+     +------------------+
  | 1. IDENTITY  | --> | IdentityRegistry  |
  | Is ONCHAINID |     | .contains(addr)   |
  | registered?  |     +------------------+
  +------+-------+
         | PASS
         v
  +------+-------+     +------------------+
  | 2. CLAIMS    | --> | IdentityRegistry  |
  | KYC + AML +  |     | .isVerified(addr) |
  | Accredited?  |     +------------------+
  +------+-------+
         | PASS
         v
  +------+-------+     +--------------------+
  | 3. COUNTRY   | --> | CountryRestrict    |
  | Jurisdiction |     | Module (CN blocked) |
  | approved?    |     +--------------------+
  +------+-------+
         | PASS
         v
  +------+-------+     +--------------------+
  | 4. MODULES   | --> | ModularCompliance  |
  | MaxBalance + |     | .canTransfer()     |
  | SupplyLimit  |     +--------------------+
  +------+-------+
         | ALL PASS
         v
    Transfer executes
```

### Three Compliance Modules Deployed

| Module | Function | Setting |
|--------|----------|---------|
| CountryRestrictModule | Blocks restricted jurisdictions | China (156) blocked |
| MaxBalanceModule | Per-wallet balance ceiling | 1,000,000 CPC max |
| SupplyLimitModule | Total supply cap | 1,000,000 CPC max |

### Demo Wallets Show Real Compliance Scenarios

| Wallet | Country | Identity | Claims | Compliance | Result |
|--------|---------|----------|--------|------------|--------|
| Alice | DE (276) | Registered | All verified | Passes | **Eligible** |
| Bob | US (840) | None | None | N/A | **Blocked** (no identity) |
| Charlie | CN (156) | Registered | All verified | Fails (country) | **Blocked** (restricted) |
| Diana | FR (250) | Registered | All verified | Passes | **Freeze demo** |

---

## Slide 7: Use-of-Proceeds Tracking

### The Green Bond Transparency Gap

Traditional green bonds:
- Publish use-of-proceeds reports **12-18 months** after issuance
- Reports are **static PDFs** with no independent verification
- Investors must **trust** the issuer's self-reported allocations

### Coppice's Solution: HCS Impact Tracking

Every fund allocation is recorded to a **Hedera Consensus Service topic** as an immutable, timestamped JSON message:

```json
{
  "type": "PROCEEDS_ALLOCATED",
  "ts": "2026-03-15T14:30:00Z",
  "data": {
    "project": "Nordic Wind Farm Expansion",
    "category": "Renewable Energy",
    "amount": 250000,
    "currency": "USD"
  }
}
```

### Five Green Categories

| Category | Example |
|----------|---------|
| Renewable Energy | Wind farms, solar installations |
| Energy Efficiency | Building retrofits, smart grids |
| Clean Transportation | EV infrastructure, rail electrification |
| Sustainable Water | Treatment plants, desalination |
| Green Buildings | LEED-certified construction |

The frontend renders real-time allocation breakdowns by category with stacked progress bars -- investors can verify fund allocation without waiting for annual reports.

---

## Slide 8: Why Hedera

### 1. Carbon-Negative Network

Hedera is the only major L1 verified as **carbon-negative** by **UCL's Centre for Blockchain Technologies** [7]. Energy per transaction: **0.000003 kWh** -- less than a Google search. Carbon offsets purchased quarterly via Terrapass green-e certified credits.

A green bond should run on the greenest network.

### 2. Low, Predictable Fees

ERC-3643 compliance-heavy transactions involve **multiple contract calls** per transfer (identity check, claims verification, country check, compliance module check). Hedera's low fees (~$0.0001/tx) [8] make this economically viable at scale. On Ethereum mainnet, the same transfer could cost $5-50 in gas.

### 3. Strategic Alignment

The **Hedera Foundation joined the ERC-3643 Association** in March 2025 [9], alongside DTCC, ABN AMRO Bank, Deloitte, Fireblocks, and OpenZeppelin. In November 2025, Hedera **integrated ERC-3643 into its Asset Tokenization Studio** [10].

Coppice is building exactly what Hedera's institutional strategy calls for.

### 4. Multi-Service Architecture

No other chain offers the combination of:
- **EVM smart contracts** for compliance logic
- **Consensus Service** for immutable audit trails
- **Token Service** for native stablecoin settlement
- **Mirror Node** for real-time data queries

This lets Coppice be a truly native Hedera application, not just EVM code running on Hedera's relay.

---

## Slide 9: Market Validation

### Institutional Precedent

| Deployment | Details | Relevance |
|-----------|---------|-----------|
| **ABN AMRO** (Sept 2023) | EUR 5M digital green bond on Polygon using ERC-3643 + Tokeny. Investor: DekaBank. Custody: Fireblocks. [11] | Proves green bond + ERC-3643 works in production. Coppice adds HCS audit trail on a carbon-negative chain. |
| **HKSAR** (Feb 2023) | HK$800M tokenized government green bond. T+1 settlement. [12] | Proves government-scale tokenized green bonds work. |
| **BIS Project Genesis** (2022) | Retail green bond prototype with real-time ESG tracking via IoT. [13] | Validates the concept of real-time impact verification -- exactly what Coppice's HCS tracking provides. |

### Regulatory Tailwinds

- **EU Green Bond Standard** (Regulation 2023/2631) -- effective December 2024. Demands taxonomy-aligned use-of-proceeds and external review. [3]
- **ERC-3643 Association** -- 24 institutional members (DTCC, Deloitte, Hedera, ABN AMRO, OpenZeppelin). $32B+ tokenized. [6]
- **Hedera ecosystem** -- DeFi TVL grew **141% YoY** to $208M by end of 2025. $10B+ in RWA settlements processed on Hedera. [14]

### Competitive Landscape

| Project | Chain | Compliance | Use-of-Proceeds | Carbon-Negative |
|---------|-------|------------|------------------|-----------------|
| ABN AMRO / Tokeny | Polygon | ERC-3643 | Off-chain PDF | No |
| Securitize | Multi-chain | Custom | Off-chain | No |
| Obligate | Polygon/Base | Swiss DLT | Off-chain | No |
| **Coppice** | **Hedera** | **ERC-3643** | **On-chain (HCS)** | **Yes** |

No other project combines ERC-3643 compliance with on-chain use-of-proceeds tracking on a carbon-negative chain.

---

## Slide 10: Go-To-Market & Business Model

### Lean Canvas

| Block | Content |
|-------|---------|
| **Problem** | 1) $100K+ minimums lock out retail investors. 2) Greenwashing risk -- no verifiable proof proceeds fund green projects. 3) T+2 settlement, no liquidity. |
| **Customer Segments** | Institutional issuers (banks, corporates), ESG-focused retail investors, compliance officers, sustainability reporting teams |
| **Unique Value Prop** | First compliant green bond platform on a carbon-negative chain -- ERC-3643 compliance + HCS impact tracking + fractional ownership |
| **Solution** | Tokenized green bonds with on-chain KYC/AML, HCS audit trail, eUSD settlement, category-tagged use-of-proceeds |
| **Channels** | Hedera ecosystem partnerships, green finance conferences, EU/Asia regulatory sandboxes, DeFi integrations |
| **Revenue Streams** | Issuance fees (0.1-0.5%), annual compliance/management fees, premium ESG reporting tier |
| **Cost Structure** | Smart contract audits, regulatory licensing, Hedera network fees (~$0.0001/tx), development |
| **Key Metrics** | AUM (bonds issued), verified investors, jurisdictions covered, settlement time |
| **Unfair Advantage** | First-mover on ERC-3643 + Hedera, Hedera Foundation's ERC-3643 Association membership, EU GBS readiness |

### Target Path

1. **Now:** Hackathon demo on testnet -- proof of concept
2. **Next:** Mainnet pilot with a real green bond issuer (target: sub-EUR-10M bond)
3. **Then:** Multi-bond platform with secondary market trading, coupon distribution, and regulatory sandbox applications (EU, Singapore, UAE)

---

## Slide 11: Success Metrics & Ecosystem Impact

### Hedera Ecosystem Growth Potential

| Metric | How Coppice Contributes |
|--------|------------------------|
| **Account creation** | Every verified investor needs a Hedera account + ONCHAINID identity. A single bond with 100 investors = 200+ new accounts. |
| **TPS growth** | Compliance-heavy transfers generate 4-6 contract calls per transaction. HCS submissions add further. A bond with daily trading activity = sustained TPS. |
| **TVL increase** | Each tokenized bond adds its full notional value to Hedera DeFi TVL. A EUR 5M bond (ABN AMRO scale) would represent ~2.5% of current Hedera DeFi TVL ($208M). |
| **Institutional adoption** | ERC-3643 is the standard DTCC, Deloitte, and ABN AMRO are backing. Coppice demonstrates Hedera can run it. |

### At Scale: 100 Green Bonds on Hedera

| Metric | Projection |
|--------|-----------|
| **Verified investors** | 10,000+ (100 investors per bond average) |
| **On-chain identities** | 20,000+ (1 Hedera account + 1 ONCHAINID per investor) |
| **Monthly transactions** | 50,000+ compliance-checked transfers (4-6 contract calls each) |
| **TVL contribution** | EUR 500M+ (ABN AMRO-scale bonds at EUR 5M each) = 240% of current Hedera DeFi TVL |
| **HCS messages/month** | 100,000+ audit + impact records |

### MVP Quality

- **Fully functional on Hedera testnet** -- every feature demonstrated is a real transaction
- **Accessible:** WCAG 2.1 AA compliant -- keyboard navigation, screen reader support, aria-live regions
- **Mobile responsive:** Tested at 390x844 viewport
- **Error recovery:** Automatic eUSD refund if CPC mint fails after transfer

### Feedback & Validation Plan

| Channel | Method | Status |
|---------|--------|--------|
| **Hedera community** | Share live demo in Discord/Telegram, collect UX feedback | Planned |
| **Green bond issuers** | Outreach via ERC-3643 Association network | Planned |
| **Regulatory sandbox** | Submit to EU/Singapore/UAE sandbox programs | Post-hackathon |
| **Open source** | Public repo for community review and contributions | Active |

---

## Slide 12: Roadmap & Learnings

### What's Built (Hackathon)

- Full ERC-3643 T-REX deployment with 12 contracts + 3 compliance modules
- Investor portal with 4-gate compliance verification
- Issuer dashboard with mint, freeze, pause, and allocate
- Compliance monitor with real-time HCS audit feed
- eUSD stablecoin settlement via HTS
- Use-of-proceeds tracking with category visualization
- 115 tests (contract + unit + E2E)
- Accessible, mobile-responsive frontend

### What's Next

| Phase | Milestone | Timeline |
|-------|-----------|----------|
| **1. Mainnet** | Deploy to Hedera mainnet with real USDC settlement | Q2 2026 |
| **2. Coupon distribution** | Automated coupon payments via HTS scheduled transactions | Q3 2026 |
| **3. Secondary market** | P2P trading with compliance-checked transfers | Q3 2026 |
| **4. Multi-bond** | Platform for multiple issuers, each with own compliance rules | Q4 2026 |
| **5. Regulatory sandbox** | EU/Singapore/UAE sandbox applications | Q4 2026 |
| **6. IoT integration** | Real-time environmental impact data feeding HCS (a la BIS Project Genesis) | 2027 |

### Hackathon Learnings

- **ERC-3643 on Hedera works.** T-REX v4.1.6 deploys and runs correctly on Hedera EVM with no modifications to the standard.
- **HCS is perfect for compliance audit trails.** Immutable, timestamped, publicly queryable -- exactly what regulators want.
- **HTS + EVM interop is powerful.** The long-zero address mapping (HIP-218) lets HTS tokens behave as ERC-20s inside EVM contracts, enabling seamless stablecoin settlement.
- **Solo developer scope is tight.** Focused execution on core features rather than breadth. Every feature is tested and functional.

---

## Sources

[1] LSEG. "Green Debt Market Passes $3 Trillion Milestone." 2025. https://www.lseg.com/en/insights/green-debt-market-passes-3-trillion-milestone

[2] Environmental Finance. "Resilience, Innovation and Reinvention: The Sustainable Bond Market in 2025." https://www.environmental-finance.com/content/the-green-bond-hub/resilience-innovation-and-reinvention-the-sustainable-bond-market-in-2025.html

[3] European Commission. "European Green Bond Standard." Regulation (EU) 2023/2631. https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/european-green-bond-standard-supporting-transition_en

[4] ABN AMRO Research. "Uptick of EU GBS Will Be Limited." 2025. https://www.abnamro.com/research/en/our-research/esg-strategist-uptick-of-eu-gbs-will-be-limited-and-restricted-to-a-few

[5] Climate Bonds Initiative. "Global State of the Market 2024." https://www.climatebonds.net/

[6] ERC-3643 Association. "About." https://www.erc3643.org/

[7] UCL Centre for Blockchain Technologies. "Hedera Energy Study." https://hedera.com/ucl-blockchain-energy

[8] Hedera. "Fees." https://hedera.com/fees

[9] Hedera Foundation. "Scaling Institutional RWAs: The HBAR Foundation Joins the ERC-3643 Association." March 2025. https://hedera.foundation/blog/scaling-institutional-rw-as-the-hbar-foundation-joins-the-erc-3643-association

[10] Hedera. "Hedera Integrates ERC-3643 Token Standard into Asset Tokenization Studio." November 2025. https://hedera.com/blog/hedera-integrates-erc-3643-token-standard-into-asset-tokenization-studio/

[11] Tokeny. "ABN AMRO Success Story." https://tokeny.com/success-story-abn-amros-bond-tokenization-on-polygon/

[12] CoinTelegraph. "Hong Kong Government Issues $800M Tokenized Green Bond." February 2023. https://cointelegraph.com/news/hong-kong-issues-tokenized-green-bond

[13] BIS Innovation Hub. "Project Genesis: Green Bond Tokenisation." https://www.bis.org/about/bisih/topics/green_finance/green_bonds.htm

[14] Hedera Foundation. "Hedera 2025 Year in Review." https://www.hedera.foundation/blog/hedera-2025-year-in-review

---

## Sustainability Track Variant

If submitting to the **Sustainability** track instead of DeFi & Tokenization, adjust the following slides:

### Slide 2 (Problem) -- Lead with climate gap:
Replace opening with: "The world needs $7.5 trillion per year in green investment by 2030 for net-zero. We're at $600 billion. The gap isn't just about capital -- it's about trust."

### Slide 3 (Solution) -- Emphasize environmental verification:
Add: "Coppice turns green bonds from trust-based instruments into verify-based instruments. Every dollar allocated, every category tagged, every timestamp recorded -- immutably on Hedera's carbon-negative network."

### Slide 8 (Why Hedera) -- Lead with carbon-negative:
Move the carbon-negative section to first position and expand: "Hedera uses 0.000003 kWh per transaction (UCL study). Bitcoin uses 707 kWh. A green bond issued on Bitcoin would consume more energy than many of the green projects it funds."

### Slide 10 (GTM) -- Sustainability-focused channels:
Replace "DeFi integrations" with: "Climate tech accelerators, UN Principles for Responsible Investment (PRI) signatories, green bond standards bodies."

### Slide 11 (Success) -- Impact metrics:
Add: "Each bond tokenized enables real-time verification of environmental impact. With HCS, auditors and NGOs can independently verify that fund allocations match stated green objectives -- a capability that does not exist in the traditional bond market."
