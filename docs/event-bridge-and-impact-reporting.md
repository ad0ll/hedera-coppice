# Event Bridge Pattern & Green Bond Impact Reporting

Research compiled March 14, 2026. Read this after structural repo changes are complete.

---

## Part 1: Event Bridge Pattern (EVM -> HCS)

Our event-logger service polls `eth_getLogs` every 5s, parses EVM events (Transfer, Paused, Unpaused, AddressFrozen), and submits structured JSON to an HCS audit topic. This is a well-established Hedera pattern.

### Confirmed Precedents

| Project | Type | How It Works |
|---------|------|-------------|
| **hashport-validator** (LimeChain) | Production bridge | Exact match: polls `eth_getLogs` (15s interval), parses log topics, submits to HCS via `TopicMessageSubmitTransaction`. Tracks `fromBlock` in Postgres. |
| **Oxiles Event Bridge** | Hackathon winner ($20K, Hedera20) | Generalized bridge: EVM events in, HCS topics out. Fork of ConsenSys Eventeum. |
| **hedera-proof-of-action-microservice** | Official Hedera example | Captures events via API, submits to HCS for proof, verifies via mirror node. |
| **hello-hedera-audit-log-go** | Official Hedera demo (AdsDax) | Event capture, AES-256 encrypt, submit to HCS audit trail. |
| **log4j2-hedera** | Official Hedera library | Log4j appender writing directly to HCS topics. |

### Links

- hashport-validator: https://github.com/LimeChain/hashport-validator
  - EVM watcher: `app/process/watcher/evm/watcher.go`
  - HCS submission: `TopicMessageSubmitTransaction` in validator handlers
- Oxiles Event Bridge: https://github.com/oxiles/oxiles-event-bridge
  - Demo: https://github.com/oxiles/oxiles-event-bridge-demo
- Proof-of-Action: https://github.com/hashgraph/hedera-proof-of-action-microservice
- Audit Log Go: https://github.com/hashgraph/hello-hedera-audit-log-go
- log4j2-hedera: https://github.com/hashgraph/log4j2-hedera
- Hedera Blog (Dec 2025): https://hedera.com/blog/pragmatic-blockchain-design-patterns-integrating-blockchain-into-business-processes/
  - Recommends "event-driven pipelines, message queues, or middleware microservices"
- Hedera Decentralized Logs: https://hedera.com/use-cases/decentralized-logs
  - Positions HCS as "decentralized Kafka" for immutable event logging

### HIP Status for Native EVM->HCS

- **HIP-478**: Oracle integration (external data feeds into Hedera). NOT system contracts for HCS.
- **HIP-1208**: The actual HCS precompile proposal (allowing Solidity to write to HCS natively). Status: Proposed/Draft. NOT live on testnet or mainnet.
- Until HIP-1208 ships, an off-chain service is the only way to bridge EVM events to HCS.

---

## Part 2: Green Bond Impact Reporting

### What Is It?

Impact reporting discloses the environmental outcomes of projects funded by green bond proceeds. It goes beyond allocation reporting (where money went) to quantify real-world benefits: CO2 avoided, renewable energy generated, habitats protected.

Two report types throughout a bond's life:
1. **Allocation reports** -- where proceeds were deployed (project names, amounts, categories)
2. **Impact reports** -- environmental outcomes of those deployments (quantitative metrics)

### The Three Standards

#### ICMA Green Bond Principles (GBP) -- Global Benchmark
- Referenced by 98% of sustainable bond issuance worldwide ($5T+ market)
- Voluntary process guidelines, four pillars: Use of Proceeds, Project Evaluation, Management of Proceeds, Reporting
- Impact reporting: annual, recommended (not mandatory)
- Publishes the Harmonised Framework for Impact Reporting (latest: June 2024, updated June 2025)
- Links:
  - Principles: https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/green-bond-principles-gbp/
  - Harmonised Framework (PDF): https://www.icmagroup.org/assets/documents/Sustainable-finance/2024-updates/Handbook-Harmonised-Framework-for-Impact-Reporting-June-2024.pdf
  - Impact Reporting page: https://www.icmagroup.org/sustainable-finance/impact-reporting/green-projects/

#### Climate Bonds Standard (CBS) -- Certification-Based
- Mandatory annual allocation reporting + post-issuance verification within 24 months
- Impact reporting encouraged but not strictly mandatory
- V4.0: Enhanced transition criteria, adaptation/resilience certification
- Link: https://climate.sustainability-directory.com/term/climate-bonds-standard/

#### EU Green Bond Standard (EuGBS) -- Regulatory (Dec 2024)
- Legally binding once opted in to "EuGB" label
- Proceeds must align with EU Taxonomy (up to 15% exception)
- At least one impact report during bond lifetime + one after full allocation (mandatory)
- External review mandatory, supervised by ESMA
- Penalties: up to 0.5% annual turnover
- Links:
  - EUR-Lex: https://eur-lex.europa.eu/EN/legal-content/summary/european-green-bond-standard.html
  - European Commission: https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/european-green-bond-standard-supporting-transition_en

### ICMA Core Metrics by Category

| Category | Core Metrics |
|----------|-------------|
| Renewable Energy | tCO2e avoided, MWh/GWh generated, MW capacity installed |
| Energy Efficiency | MWh saved, tCO2e avoided |
| Green Buildings | Energy use reduction %, GHG avoided, water use reduced (m3/m2/yr), waste recycled % |
| Clean Transportation | GHG avoided, passengers carried/km served, particulate matter reduction |
| Sustainable Water | People with clean water access, volume treated (m3), pollutant concentrations |
| Waste Management | Tonnes diverted from landfill, GHG from methane reduction, energy from waste (MWh) |
| Biodiversity | Hectares protected/restored, species populations stabilized |

### Blockchain Projects With On-Chain Impact Reporting

**BIS Project Genesis 2.0** (BIS + Hong Kong + Goldman Sachs, COP27 2022)
- Most advanced prototype: tokenized carbon forwards attached to green bonds
- IoT-monitored environmental performance linked to bond coupon "green premium"
- Smart contracts enforce bond terms, carbon credit obligations, delivery mechanics
- Links:
  - Overview: https://www.bis.org/about/bisih/topics/green_finance/genesis_2.htm
  - Full report (PDF): https://www.bis.org/publ/othp58.pdf
  - Goldman Sachs coverage: https://www.ledgerinsights.com/goldman-sachs-blockchain-green-bond-bis/

**ABN AMRO / Tokeny** (ERC-3643 on Polygon, Sept 2023)
- EUR 5M green bond, ERC-3643 compliance, Fireblocks custody
- Impact reporting stayed OFF-CHAIN (traditional channels)
- Notable gap: blockchain used for compliance only, not impact tracking
- Links:
  - ABN AMRO: https://www.abnamro.com/en/news/abn-amro-registers-first-digital-green-bond-on-the-public-blockchain
  - Tokeny: https://tokeny.com/success-story-abn-amros-bond-tokenization-on-polygon/

**Hedera Guardian** -- Open-source MRV tool
- Uses HCS for immutable environmental claims (same pattern as our impact topic)
- W3C DIDs + Verifiable Credentials for signed environmental claims
- Used by Verra (largest carbon credit registry), Standard Bank, DOVU
- Links:
  - Guardian: https://hedera.com/guardian
  - Verra partnership: https://verra.org/verra-and-hedera-to-accelerate-digital-transformation-of-carbon-markets/

### Opportunity for Coppice

Our HCS impact topic already stores `PROCEEDS_ALLOCATED` events with ICMA-aligned categories. To differentiate:
1. Add `IMPACT_REPORTED` event type with ICMA metrics (`co2_avoided_tonnes`, `energy_generated_mwh`, `capacity_installed_mw`)
2. Include methodology and assumptions in the event payload
3. Build a UI component showing cumulative environmental impact
4. This puts us ahead of ABN AMRO (they kept impact off-chain) and aligns with BIS Project Genesis vision
