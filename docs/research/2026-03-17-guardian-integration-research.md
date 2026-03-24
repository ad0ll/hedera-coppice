# Guardian Integration Research for Coppice Green Bonds

> **Date:** March 17, 2026
> **Status:** Research complete, no implementation yet
> **Context:** Evaluating Hedera Guardian for anti-greenwashing in our green bond platform

## Table of Contents

1. [Bond Lifecycle Primer](#1-bond-lifecycle-primer)
2. [The Greenwashing Problem](#2-the-greenwashing-problem)
3. [What is Hedera Guardian?](#3-what-is-hedera-guardian)
4. [Guardian Key Concepts](#4-guardian-key-concepts)
5. [Guardian Technical Architecture](#5-guardian-technical-architecture)
6. [Guardian API Surface](#6-guardian-api-surface)
7. [How Guardian Addresses Greenwashing](#7-how-guardian-addresses-greenwashing)
8. [Integration Options for Coppice](#8-integration-options-for-coppice)
9. [Feasibility Assessment](#9-feasibility-assessment)
10. [Recommendation](#10-recommendation)

---

## 1. Bond Lifecycle Primer

### What is a Bond?

A bond is a loan from investors to an issuer. The issuer (a company, government, or institution) borrows money and promises to:
- Pay a fixed interest rate (the **coupon rate**) at regular intervals
- Return the full borrowed amount (the **face value** / **par value**, typically $1,000 per bond) on a specific date (the **maturity date**)

Unlike stocks (which make you a part-owner), bonds make you a creditor. Your upside is capped at the agreed interest, but you get paid before stockholders if the issuer goes bankrupt.

### Bond Lifecycle Stages

| Stage | What Happens |
|-------|-------------|
| **Issuance** | Issuer structures the bond, sets coupon rate, sells to investors via underwriters |
| **Settlement** | Cash and bond ownership exchange hands (traditionally T+2, tokenized = near-instant) |
| **Coupon Payments** | Periodic interest payments (usually semi-annual). Formula: `Face Value x (Annual Rate / Payments Per Year)` |
| **Record Date** | Snapshot date determining who receives the next coupon payment |
| **Secondary Trading** | Bonds trade between investors; price fluctuates inversely with interest rates |
| **Maturity/Redemption** | Issuer returns face value + final coupon; bond ceases to exist |
| **Default** | Issuer fails to pay; triggers restructuring or bankruptcy proceedings |

### What Makes a Green Bond "Green"?

A green bond is structurally identical to a regular bond. The single critical difference: **proceeds must be used exclusively for environmentally beneficial projects** (renewable energy, clean transport, energy efficiency, etc.).

### Green Bond Additional Lifecycle Stages

| Stage | What Happens |
|-------|-------------|
| **Framework Establishment** | Issuer publishes a Green Bond Framework addressing ICMA's 4 core components |
| **External Review (SPO)** | Independent reviewer (Sustainalytics, S&P, etc.) assesses framework alignment |
| **Use of Proceeds Allocation** | Money deployed to eligible projects, tracked in dedicated sub-account |
| **Impact Reporting** | Annual reports: where money went + measurable environmental outcomes |
| **Post-Issuance Verification** | External auditor verifies proceeds actually went to eligible projects |

### ICMA Green Bond Principles (4 Core Components)

1. **Use of Proceeds** — Funds must go exclusively to eligible green projects
2. **Process for Project Evaluation & Selection** — Clear disclosure of how projects are chosen
3. **Management of Proceeds** — Tracked in dedicated sub-account; unallocated funds held separately
4. **Reporting** — Annual reports on allocation and environmental impact metrics

---

## 2. The Greenwashing Problem

### What is Greenwashing?

Greenwashing is when an organization makes misleading claims about the environmental benefits of its activities. In green bonds: the issuer labels a bond "green" but proceeds don't genuinely fund environmental projects, or benefits are exaggerated/unverifiable.

### Why It Matters

- A 2021 EU report found 42% of green claims by companies were exaggerated, false, or deceptive
- If investors can't trust "green" labels, capital stops flowing to genuine environmental solutions
- The credibility of the entire sustainable finance market depends on verifiable claims

### Real-World Examples

- **Repsol (2017):** 500M EUR "green bond" for oil refinery efficiency — criticized as still supporting fossil fuel infrastructure
- **JBS:** $3.2B sustainability bonds tied to net-zero-by-2040, but emissions actually increased
- **Deutsche Bank/DWS:** Police raid over allegedly false ESG asset claims ($900B in assets)
- **China (2019):** ~$12.1B (21.7%) of new green bonds considered "greenwashed" due to fragmented regulation

### What's Missing

The core problem: **traditional green bond verification relies on trust and annual PDF reports**. There's no real-time visibility, no immutable audit trail, and verification can be superficial. This is exactly the gap that Guardian (and blockchain more broadly) aims to fill.

---

## 3. What is Hedera Guardian?

Hedera Guardian is an open-source platform (Apache 2.0, incubated under Hyperledger) that digitizes ESG policies and issues verifiable digital records to bring trust, transparency, and anti-fraud capabilities to environmental markets.

### In Plain English

Guardian is a **workflow engine for environmental claims**. It takes a standard (like Verra VCS or Gold Standard), encodes the rules as a digital "policy," then orchestrates the entire process of: submitting project data, getting it independently verified, and minting tokens that represent verified environmental outcomes. Every step produces cryptographically signed documents stored immutably on Hedera (HCS) and IPFS.

### What Guardian is NOT

- NOT a token platform (it uses Hedera's existing HTS for tokens)
- NOT a blockchain (it runs on top of Hedera)
- NOT a simple API service (it's a full microservices platform requiring 13+ Docker containers)
- NOT specifically designed for bonds (it's designed for carbon credits/offsets, but is extensible)

---

## 4. Guardian Key Concepts

### Roles

| Role | Description |
|------|-------------|
| **Standard Registry (SR)** | Governing authority (e.g., Verra, Gold Standard). Publishes policies, approves VVBs, reviews issuance. |
| **Validation/Verification Body (VVB)** | Independent auditor. Validates project descriptions and verifies monitoring reports. |
| **Project Proponent** | Entity running the environmental project. Submits project data and MRV reports. |

### Key Terms

| Term | Definition |
|------|-----------|
| **Policy** | A set of rules, roles, workflows, and data-handling logic governing how VCs are issued/verified. Built from 47+ modular workflow blocks. |
| **Schema** | W3C/JSON-LD data structure defining what fields a VC must contain (project name, GPS, methodology, etc.) |
| **MRV** | Measurement, Reporting, Verification — the process of proving environmental claims are real |
| **dMRV** | Digital MRV — IoT sensors, satellite data, or digital inputs feeding directly into Guardian |
| **VC (Verifiable Credential)** | Cryptographically signed claim (project description, monitoring report, verification statement) |
| **VP (Verifiable Presentation)** | Package of VCs formatted for presentation; stored on IPFS, referenced by HCS messages |
| **Trust Chain** | Publicly traversable provenance chain: Token -> VP -> VCs -> Policy -> Registry |
| **DID** | W3C Decentralized Identifier for each participant; used to sign VCs |

### End-to-End Flow

```
1. Standard Registry publishes Policy → stored on IPFS, CID logged to HCS topic
2. Project Proponent submits Project Description → becomes a signed VC
3. VVB validates the project → issues Validation Report (VC)
4. Project Proponent submits Monitoring Reports with MRV data
5. VVB verifies Monitoring Report → issues Verification Statement (VC)
6. Standard Registry reviews and approves
7. Guardian mints HTS tokens → memo contains HCS timestamp linking to VP
8. VP encapsulates all VCs → full provenance chain is publicly traversable
```

---

## 5. Guardian Technical Architecture

### Microservices (13+ Docker containers)

| Service | Port | Purpose |
|---------|------|---------|
| `api-gateway` | 3002 | REST API (NestJS + Fastify), Swagger, WebSockets |
| `guardian-service` | 5007 | Core business logic |
| `policy-service` | 5006 | Policy Workflow Engine execution |
| `auth-service` | 5005 | JWT auth, user management |
| `worker-service` | (internal) | Async Hedera/IPFS task processing |
| `topic-listener-service` | (internal) | HCS topic monitoring |
| `queue-service` | (internal) | Message orchestration |
| `notification-service` | (internal) | User alerts |
| `logger-service` | (internal) | Centralized logging |
| `ai-service` | 3013 | LLM search, schema generation |
| `indexer-service` | 3005 | Global data indexing (read-only) |
| `mrv-sender` | 3005 | IoT MRV data simulator |
| `web-proxy` | 3000 | Angular frontend via nginx |

### Infrastructure Dependencies

| Component | Version | Purpose |
|-----------|---------|---------|
| MongoDB | 6.0 | Document database |
| NATS | 2.9 | Inter-service message broker |
| Redict (Redis) | 7.3 | Caching |
| IPFS Kubo | 0.39 | Decentralized document storage |
| HashiCorp Vault | 1.12 | Secrets management |

### Resource Requirements

- Estimated 8-16 GB RAM minimum
- 4+ CPU cores
- 20+ GB disk
- 6+ hours for indexer to fully populate
- Docker required

### Key Technical Facts

- Runtime: Node.js v20.19, TypeScript throughout
- Frontend: Angular (not embeddable in Next.js)
- Auth: JWT with RSA-2048 key pairs
- DIDs: ED25519 keys only (NOT ECDSA — incompatible with MetaMask)
- Version: 3.5.0 (February 2026)
- No dedicated JavaScript SDK (REST API only)

---

## 6. Guardian API Surface

### Authentication

```
POST /api/v1/accounts/login → returns refreshToken
POST /api/v1/accounts/access-token → body: {refreshToken} → returns accessToken
Header: Authorization: Bearer {accessToken}
```

### Key Endpoints (384 total paths in Swagger)

**Trust Chains (most relevant for read-only integration):**
- `GET /api/v1/trust-chains/` — list VP documents (paginated, filterable)
- `GET /api/v1/trust-chains/{hash}` — build full trust chain from VP to root VC

**Policies:**
- `GET /api/v1/policies/` — list all policies
- `GET /api/v1/policies/{policyId}/blocks/{uuid}` — get block data
- `PUT /api/v1/policies/{policyId}/dry-run` — enter test mode (no real Hedera txns)

**External Data (no auth required):**
- `POST /api/v1/external/{policyId}/{blockTag}` — send VC data to a policy block
- `POST /api/v1/external` — send VC data with auto-routing

**Tokens:**
- `GET /api/v1/tokens/` — list tokens
- `GET /api/v1/tokens/{tokenId}/serials` — get serial numbers

**Schemas:**
- `GET /api/v1/schemas/` — list all schemas
- `GET /api/v1/schemas/{schemaId}/sample-payload` — get sample data

### Indexer API (Read-Only, Port 3005)

Indexes ALL public Guardian data globally from Hedera/IPFS:
- Standard Registries, Policies, Schemas, Tokens, DIDs
- VP/VC Documents with relationships
- NFTs, Topics, Contracts
- Full text search, analytics, project coordinates

### NATS External Events

Guardian publishes events for external systems:
- `external-events.token_minted` — tokenId, value, memo
- `external-events.block_event` — policy block state changes
- `external-events.ipfs_added_file` — CID, URL

---

## 7. How Guardian Addresses Greenwashing

Guardian combats greenwashing through six mechanisms:

1. **Immutable Audit Trail** — Every action produces an HCS message. These form a linked-list across topics that cannot be altered. Queryable via mirror node.

2. **Digital MRV (dMRV)** — Replaces manual data collection with digital pipelines. IoT sensors and satellite data feed directly into Guardian, reducing human manipulation.

3. **Cryptographic Provenance** — Every environmental claim is a VC signed with the creator's DID. The signing chain is mathematically verifiable.

4. **Independent Verification Workflow** — Policy enforces separation of duties. Project Proponents cannot self-verify. VVBs must independently validate/verify.

5. **Anti-Double-Counting** — Global Indexer checks for data similarities and potential duplicates across all Guardian instances.

6. **Transparent Token Provenance** — Every minted token links back to its VP/VC chain via memo field. Anyone can trace a token to raw MRV data.

### Mapping to Green Bond Greenwashing Risks

| Greenwashing Risk | Guardian Mechanism | Current Coppice Equivalent |
|---|---|---|
| False environmental claims | dMRV + cryptographic VCs | HCS audit topic (log-only) |
| Unverified impact data | VVB verification workflow | Mock data on Impact page |
| Double-counting benefits | Global Indexer deduplication | None |
| Opaque use of proceeds | Trust chain provenance | On-chain token tracking |
| Self-certification | Enforced role separation | Deployer-only operations |
| Altered historical records | Immutable HCS messages | HCS audit topic (same) |

---

## 8. Integration Options for Coppice

### Option A: Full Guardian Deployment (Heavyweight)

**What:** Run the full Guardian stack (13+ containers), create a custom green bond policy, submit MRV data through the policy workflow, display trust chains on our frontend.

**Pros:**
- Complete anti-greenwashing infrastructure
- Genuine trust chains with independent verification
- Impressive for hackathon judges who know Guardian

**Cons:**
- 13+ Docker containers, 8-16 GB RAM
- No green bond policy exists — must build from scratch
- Guardian uses ED25519 (incompatible with MetaMask/ECDSA)
- Multi-day effort for policy design alone
- Angular frontend not embeddable in Next.js

**Effort:** 3-5 days | **Risk:** Very high for hackathon timeline

### Option B: Managed Guardian Service (SaaS)

**What:** Use Envision Blockchain's hosted Guardian at guardianservice.io. Same API, no Docker management.

**Pros:**
- No infrastructure management
- 99.9% uptime SLA
- API at guardianservice.app/api/v1/

**Cons:**
- Requires contacting Envision for access/pricing
- Same policy-building effort as Option A
- Unknown timeline for account setup
- Still need to bridge ED25519 vs ECDSA

**Effort:** 2-4 days (if access is fast) | **Risk:** High (access uncertainty)

### Option C: Lightweight Read-Only Integration (No Guardian Instance)

**What:** Since all Guardian data is public on Hedera HCS and IPFS, query existing Guardian trust chains from our frontend without running Guardian ourselves.

**How:**
1. Query HCS topics via Mirror Node: `GET /api/v1/topics/{topicId}/messages`
2. Decode messages to extract IPFS CIDs
3. Resolve CIDs via IPFS gateway: `https://ipfs.io/ipfs/{CID}`
4. Display trust chain data in our Impact page

**Pros:**
- Zero infrastructure overhead
- Only HTTP calls (fetch) needed
- Shows understanding of Guardian architecture
- Works with existing Next.js frontend

**Cons:**
- Read-only — can't submit our own MRV data
- Depends on finding relevant Guardian data on testnet
- Not our own trust chains — displaying others' data
- Limited hackathon value without our own policy

**Effort:** 1-2 days | **Risk:** Medium (data availability)

### Option D: Guardian-Inspired Architecture (Our Own Lightweight Version)

**What:** Implement Guardian's core anti-greenwashing principles using our existing HCS infrastructure, without running Guardian itself. Extend our HCS audit/impact topics to post structured VCs following Guardian's patterns.

**How:**
1. Define simple VC schemas for: Project Description, MRV Report, Verification Statement
2. Post structured JSON-LD VCs to our Impact HCS topic (0.0.8214935)
3. Build a trust chain viewer on our Impact page that traces: Bond Token -> HCS messages -> IPFS documents
4. Use our existing deployer wallet as "Standard Registry" and mock a VVB role
5. Reference Guardian architecture explicitly in documentation

**Pros:**
- Uses our existing HCS infrastructure (topics already deployed)
- No new Docker containers or services
- Demonstrates deep understanding of Guardian concepts
- Architecturally honest — implements the same principles
- Fits within hackathon timeline
- Compatible with our ethers v6 / MetaMask stack

**Cons:**
- Not "real" Guardian — judges who check may notice
- No independent verification (we control all roles)
- Missing dMRV and anti-double-counting
- Less impressive than actual Guardian integration

**Effort:** 1-2 days | **Risk:** Low

### Option E: Hybrid — Guardian Indexer + Our Own VCs

**What:** Run only the Guardian Global Indexer (lighter than full stack) to display existing Guardian trust chains, while also posting our own Guardian-style VCs to our HCS topics.

**Pros:**
- Real Guardian data displayed alongside our own
- Demonstrates both consumption and production of trust chains
- Indexer is read-only and relatively lightweight

**Cons:**
- Still needs Docker (indexer + MongoDB + IPFS)
- 6+ hours for indexer to populate
- Adds operational complexity

**Effort:** 2-3 days | **Risk:** Medium

---

## 9. Feasibility Assessment

### Hackathon Constraints

- **Deadline:** March 23, 2026 (6 days from today)
- **Solo developer**
- **Remaining work:** Coupons page, Impact page, nav update, coupon management, E2E tests
- **Infrastructure:** Already running Next.js + Hedera testnet contracts

### Decision Matrix

| Option | Effort | Risk | Impressiveness | Feasibility |
|--------|--------|------|---------------|-------------|
| A: Full Guardian | 3-5 days | Very High | Very High | LOW |
| B: Managed SaaS | 2-4 days | High | Very High | LOW |
| C: Read-Only | 1-2 days | Medium | Medium | MEDIUM |
| D: Guardian-Inspired | 1-2 days | Low | Medium-High | HIGH |
| E: Hybrid Indexer | 2-3 days | Medium | High | MEDIUM |

---

## 10. Recommendation

**Option D (Guardian-Inspired Architecture)** is the recommended approach for the hackathon, with the following reasoning:

1. **It's honest:** We implement the same anti-greenwashing principles (immutable audit trail, structured VCs, provenance chains) without pretending to run Guardian
2. **It's feasible:** Uses our existing HCS topics and ethers v6 stack
3. **It's educational:** Demonstrates deep understanding of Guardian, MRV, and trust chains
4. **It's extensible:** The VC structure we define could later be submitted to a real Guardian instance
5. **It fits the timeline:** 1-2 days of work alongside remaining feature development

### What This Looks Like in Practice

The Impact page would show:
- **Project Portfolio** with structured data (location, capacity, methodology)
- **Trust Chain Viewer** tracing: CPC Bond Token -> HCS Impact Messages -> Project VCs
- **MRV Data Feed** showing environmental metrics from our Impact HCS topic
- **ICMA Alignment Checklist** with the 4 core components
- **"Powered by Hedera Guardian Architecture"** note explaining the approach

Each project card would link to HCS messages on HashScan, showing the immutable audit trail.

### Future Path (Post-Hackathon)

If pursuing Guardian integration seriously after the hackathon:
1. Set up the Managed Guardian Service (guardianservice.io)
2. Design a proper ICMA Green Bond Principles policy
3. Integrate real dMRV data sources (solar panel APIs, energy monitoring)
4. Bridge our ATS bond tokens with Guardian's trust chain system
5. Implement real VVB role with independent verification

---

## Glossary

| Term | Definition |
|------|-----------|
| **tCO2e** | Tonnes of CO2 equivalent — standard unit for greenhouse gas emissions |
| **MRV** | Measurement, Reporting, Verification — proving environmental claims are real |
| **dMRV** | Digital MRV — IoT/satellite data feeding directly into verification systems |
| **ICMA GBP** | International Capital Market Association Green Bond Principles |
| **CBI** | Climate Bonds Initiative — certification scheme for green bonds |
| **SPO** | Second Party Opinion — independent assessment of a green bond framework |
| **Verra VCS** | Verified Carbon Standard — world's largest voluntary carbon credit standard |
| **Gold Standard** | Premium carbon credit standard founded by WWF |
| **VC** | Verifiable Credential — cryptographically signed environmental claim |
| **VP** | Verifiable Presentation — package of VCs for presentation |
| **DID** | Decentralized Identifier — W3C standard digital identity |
| **HCS** | Hedera Consensus Service — immutable message logging |
| **HTS** | Hedera Token Service — native token creation/management |
| **VVB** | Validation/Verification Body — independent auditor |
| **BBS+** | Signature scheme enabling selective disclosure (zero-knowledge proofs) |

---

## Sources

- [Guardian Official Documentation](https://guardian.hedera.com/)
- [Guardian GitHub Repository](https://github.com/hashgraph/guardian)
- [Guardian FAQs](https://guardian.hedera.com/guardian/faqs)
- [HIP-28: Guardian Type Solution](https://hips.hedera.com/hip/hip-28)
- [ICMA Green Bond Principles (June 2025)](https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/green-bond-principles-gbp/)
- [IPFS & Hedera Guardian](https://blog.ipfs.tech/2022-11-10-guardian-ipfs-and-hedera/)
- [Managed Guardian Service](https://guardianservice.io/)
- [Hedera Sustainability Use Cases](https://hedera.com/use-cases/sustainability/)
- [Standard Bank Bond Marketplace Analysis](https://hedera.com/blog/standard-bank-an-analysis-of-decentralized-bond-marketplaces/)
- [IFC Green Bond Handbook](https://www.ifc.org/content/dam/ifc/doc/mgrt/202203-ifc-green-bond-handbook.pdf)
- [Verra & Hedera Integration](https://verra.org/verra-and-hedera-to-accelerate-digital-transformation-of-carbon-markets/)


## GTM

Initial product focuses on EU market: 
  - Largest market share, best political alignment, clearest regulations
  - Founding team has EU citizens

Target Millenials and Gen-Z as core customer
  - RWAs are more interesting than bonds at a surface level even if they're functionally the same tihng
  - Younger generation is fed up with greenwashing, full immutable transparency can be

