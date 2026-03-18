# Guardian Integration Design for Coppice Green Bonds

> **Date:** March 17, 2026
> **Status:** Approved
> **Hackathon deadline:** March 23, 2026

## Overview

Integrate Hedera Guardian into Coppice to provide verified environmental impact data, fund allocation tracking, and a sustainability-linked coupon penalty mechanism. Guardian serves as the anti-greenwashing verification layer — it does not touch the bond's financial mechanics, but provides the independently verified environmental evidence that justifies calling it a "green" bond.

## Architecture

```
Guardian Instance (195.201.8.147)         Coppice Frontend (Vercel)
docker-compose-quickstart.yml             Next.js 16 App Router
15 containers, port 3100                  coppice.cc
HAProxy TLS at guardian.coppice.cc
                                          /api/guardian/trust-chain
Policy: "CPC Green Bond MRV"               (proxies to Guardian API)
  Roles: Standard Registry,                    |
         Bond Issuer, Verifier                 v
  5 schemas, ICMA-grounded              /impact page
  VCs on IPFS, CIDs on HCS               - Verified metrics from Guardian VCs
                                          - Trust chain viewer (inline)
Setup scripts (scripts/guardian/)          - Project cards with verified badges
  guardian-setup.ts                      /invest page (existing + new section)
  guardian-populate.ts                    - Use of Proceeds allocation bar
  guardian-verify-spt.ts                  - Guardian Verified badge
                                         /issue page (existing + new section)
ATS Bond (CPC)                            - SPT target vs actual
  0xcFbB...d9
LifeCycleCashFlow (LCCF)
  0xC36c...50
  setCoupon() adjusted by SPT result
```

**Key principle:** Guardian never holds or moves funds. Money flows on-chain via eUSD transfers. Guardian only records and verifies claims about those transfers and their environmental outcomes.

## 1. Guardian Deployment

**Server:** `bawler@195.201.8.147` — Debian trixie, 62GB RAM, 8 cores, 396GB free disk, Docker 29.2.1 + Compose v5.0.2

**CRITICAL: Do NOT interfere with existing deployments on this server.** Existing services: `ntfy` (port 8090), Next.js app (port 3000), app on port 3001, plus directories `insider-streams`, `openclaw-setup`, `private-streams-zama`, `token-launchers`, `veil`, `ntfy`. Do not touch any of these.

**Steps:**

1. Clone `hashgraph/guardian` into `/home/bawler/guardian/`
2. Use `docker-compose-quickstart.yml` — pre-built images from `gcr.io/hedera-registry/`, 15 containers
3. Port remapping: change `web-proxy` from `127.0.0.1:3000:80` to `0.0.0.0:3100:80` (avoids conflict with existing port 3000)
4. All other services use Docker-internal `expose` only — no host port conflicts
5. IPFS on `127.0.0.1:4001/5001/8080`, NATS monitor on `127.0.0.1:8222` — no conflicts

**Configuration** (`configs/.env.quickstart.guardian.system`):
- `HEDERA_NET="testnet"`
- `INITIALIZATION_TOPIC_ID="0.0.1960"` (testnet Guardian root topic)
- `OPERATOR_ID` / `OPERATOR_KEY` — new ED25519 Hedera testnet account (Guardian requires ED25519, not ECDSA)
- JWT keys: quickstart defaults (disposable dev keys, fine for hackathon)
- IPFS: local provider (Kubo node in the compose stack)
- `SECRET_MANAGER=""` (no external vault)
- `OPENAI_API_KEY` — leave as `...` (AI features not needed)

**Root `.env`:**
- `GUARDIAN_ENV=quickstart`
- `GUARDIAN_VERSION=latest`

**Startup:** `docker compose -f docker-compose-quickstart.yml up -d`

**Verification:** Guardian UI at `http://195.201.8.147:3100`, Swagger at `http://195.201.8.147:3100/api-docs/v1/`

**Resource estimate:** ~4-6GB RAM for all containers (well within 62GB). Docker network `guardian-quickstart_default` is fully isolated.

## 2. Guardian Policy: "CPC Green Bond MRV"

### Roles

| Role | Who plays it | What they do |
|------|-------------|-------------|
| Standard Registry | Guardian admin account | Publishes the policy, defines schemas, oversees the process |
| Bond Issuer | A Guardian user account | Registers projects, submits allocation reports, submits MRV data |
| Verifier (VVB) | A second Guardian user account | Independently reviews and approves/rejects submissions |

For the hackathon, we control all three accounts. In production, the Verifier would be a genuinely independent auditor (Validation/Verification Body).

### Schemas (5 Verifiable Credential types)

All schemas are grounded in the ICMA Harmonised Framework for Impact Reporting (June 2024) with blockchain-specific additions and optional EU Taxonomy Tier 1 classification fields.

#### Schema 1: Bond Framework (published once — root of trust chain)

Declares the bond's environmental commitments, eligible categories, and sustainability performance target.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `bondName` | string | — | "Coppice Green Bond" |
| `bondSymbol` | string | — | "CPC" |
| `isin` | string | — | "XS0000000009" |
| `issuer` | string | — | "Coppice Finance" |
| `currency` | string | — | "eUSD" |
| `totalIssuanceAmount` | number | — | Total CPC issued |
| `couponRate` | string | — | "4.25%" |
| `maturityDate` | string | — | ISO date |
| `couponStepUpBps` | number | — | 25 (0.25% penalty) |
| `sustainabilityPerformanceTarget` | string | — | "Avoid 10,000 tCO2e per coupon period" |
| `eligibleCategories` | string[] | ICMA | ["Renewable Energy", "Sustainable Water Management"] |
| `reportingStandard` | string | ICMA | "ICMA Green Bond Principles (June 2025)" |
| `regulatoryFrameworks` | string[] | EU/ICMA | ["ICMA GBP June 2025", "EU Taxonomy Regulation 2020/852"] |
| `taxonomyAlignmentPercent` | number | EU | Percentage of proceeds taxonomy-aligned |
| `bondContractAddress` | string | Blockchain | CPC ATS contract address |
| `lifecycleCashFlowAddress` | string | Blockchain | LCCF contract address |
| `externalReviewProvider` | string | — | "Simulated VVB (Hackathon Demo)" |

#### Schema 2: Project Registration (per funded project)

Describes a green project that bond proceeds fund. Fields map to ICMA template columns A-I.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `projectName` | string | ICMA col C | "Sunridge Solar Farm" |
| `icmaCategory` | enum | ICMA col A | Renewable Energy, Energy Efficiency, Clean Transportation, Green Buildings, Sustainable Water Management, etc. (10 ICMA categories) |
| `subCategory` | string | ICMA col B | "Solar PV", "Onshore Wind", "Water Treatment" |
| `country` | string | — | ISO country code |
| `location` | string | — | City/region |
| `capacity` | number | — | Installed capacity |
| `capacityUnit` | string | — | "MW", "MWh", "m3/day" |
| `projectLifetimeYears` | number | ICMA col I | Expected lifetime |
| `annualTargetCO2e` | number | Blockchain | Sustainability performance target for this project (not in ICMA — blockchain value-add for SPT enforcement) |
| `taxonomyActivityId` | string (opt) | EU Taxonomy | e.g., "4.1" (Solar PV), "4.3" (Wind) |
| `naceCode` | string (opt) | EU Taxonomy | e.g., "D35.11" |
| `environmentalObjective` | enum (opt) | EU Taxonomy | Climate Change Mitigation, Water & Marine Resources, etc. |
| `taxonomyAlignmentStatus` | enum (opt) | EU Taxonomy | "aligned", "eligible_not_aligned", "not_eligible" |

#### Schema 3: Fund Allocation (per allocation event)

Records that bond proceeds were allocated to a specific project. References on-chain eUSD transfer — independently verifiable on HashScan.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `projectName` | string | ICMA | Links to Project Registration |
| `signedAmountEUSD` | number | ICMA col D | Total committed |
| `allocatedAmountEUSD` | number | ICMA col H | Actually transferred |
| `shareOfFinancing` | number | ICMA col E | Percentage of total bond proceeds |
| `allocationDate` | string | — | ISO date |
| `purpose` | string | — | "Equipment Procurement", "Construction", "Operations" |
| `hederaTransactionId` | string | Blockchain | On-chain eUSD transfer tx ID (not in ICMA — blockchain value-add, verifiable on HashScan) |

#### Schema 4: MRV Monitoring Report (periodic, single schema with category tag)

Environmental outcome data. Uses ICMA Core Indicators with a flexible array structure for category-specific and optional metrics. Single schema across all project categories — the `icmaCategory` field tells the frontend how to interpret the data.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `projectName` | string | ICMA | Links to Project Registration |
| `icmaCategory` | enum | ICMA | Determines which core indicators apply |
| `reportingPeriodStart` | string | ICMA | ISO date |
| `reportingPeriodEnd` | string | ICMA | ISO date |
| `annualGHGReduced` | number | ICMA Core #1 | tCO2e — universal across ALL ICMA categories |
| `methodology` | string | ICMA | Calculation methodology (e.g., "IEA Grid Emission Factor 2025") |
| `reportingStandard` | string | ICMA | "ICMA Harmonised Framework 2024" |
| `coreIndicators` | array | ICMA | Category-specific Core Indicators as {name, value, unit} objects |
| `additionalIndicators` | array | ICMA | Optional sustainability indicators as {name, value, unit} objects |

**Core Indicators by category (populated in `coreIndicators[]`):**

Renewable Energy:
- "Annual Energy Generated" (MWh) — ICMA Core #2
- "Capacity Installed" (MW) — ICMA Core #3

Sustainable Water Management:
- "Water Saved" (m3) — ICMA Core #1
- "Wastewater Treated" (m3) — ICMA Core #2
- "Water Reduction" (%) — ICMA Core #1 derivative

**Additional Indicators (populated in `additionalIndicators[]`):**

Optional per ICMA. Examples: "Households Served" (households), "Jobs Created" (FTE), "Air Pollutants Reduced" (tonnes SO2/NOx).

#### Schema 5: Verification Statement (per Verifier review)

The Verifier's independent assessment of an MRV report.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `projectName` | string | — | Links to Project and MRV Report |
| `reportingPeriod` | string | — | Which period was verified |
| `verifiedGHGReduced` | number | — | Verifier's confirmed tCO2e (may differ from issuer's claimed value) |
| `opinion` | enum | — | "Approved", "Conditional", "Rejected" |
| `verifiedCoreIndicators` | array | — | Verifier's confirmed figures as {name, value, unit} |
| `verifierNotes` | string | — | Free-text assessment notes |

### Policy Workflow (block structure)

```
PolicyRolesBlock (define: Bond Issuer, Verifier)
  |
  +-- [Bond Issuer tab]
  |     +-- requestVcDocumentBlock (schema: Bond Framework)
  |     |     +-- sendToGuardianBlock -> persist to Hedera
  |     +-- requestVcDocumentBlock (schema: Project Registration)
  |     |     +-- sendToGuardianBlock -> persist to Hedera
  |     +-- requestVcDocumentBlock (schema: Fund Allocation)
  |     |     +-- sendToGuardianBlock -> persist to Hedera
  |     +-- requestVcDocumentBlock (schema: MRV Monitoring Report)
  |           +-- sendToGuardianBlock -> persist to Hedera
  |
  +-- [Verifier tab]
  |     +-- InterfaceDocumentsSourceBlock (view pending submissions)
  |     +-- documentValidatorBlock (schema validation)
  |     +-- InterfaceActionBlock (Approve / Reject)
  |     |     +-- [Approve] reassigningBlock (Verifier signs) -> sendToGuardianBlock
  |     |     +-- [Reject] sendToGuardianBlock (rejected status)
  |     +-- reportBlock (trust chain visualization)
  |
  +-- [Public/Investor tab]
        +-- InterfaceDocumentsSourceBlock (view verified reports, read-only)
```

## 3. Frontend Integration

### Component Structure

Following existing codebase patterns (small focused components composed in pages):

| Component | Path | Purpose |
|-----------|------|---------|
| `TrustChainViewer` | `components/guardian/trust-chain-viewer.tsx` | Visual VC chain with connected nodes |
| `VerifiedBadge` | `components/guardian/verified-badge.tsx` | Reusable "Guardian Verified" status badge |
| `GuardianProjectCard` | `components/guardian/project-card.tsx` | Project card with verified metrics and expand-to-trust-chain |
| `AllocationBar` | `components/guardian/allocation-bar.tsx` | Use of Proceeds progress bar |
| `SptStatus` | `components/guardian/spt-status.tsx` | SPT target vs actual display |
| `GuardianMetricsBanner` | `components/guardian/metrics-banner.tsx` | Aggregated verified metrics (replaces hardcoded banner) |

### Data Fetching

**API proxy route:** `frontend/app/api/guardian/trust-chain/route.ts`
- Proxies requests to `https://guardian.coppice.cc/api/v1/`
- Handles Guardian JWT authentication server-side
- Returns structured trust chain and VC data to frontend
- Error handling: returns graceful fallback data if Guardian is unreachable

**React Query hook:** `frontend/hooks/use-guardian.ts`
- `useGuardianProjects()` — fetches project registration VCs
- `useGuardianAllocations()` — fetches fund allocation VCs
- `useGuardianMRV()` — fetches verified MRV report VCs
- `useGuardianTrustChain(projectName)` — fetches full trust chain for a project
- All use React Query with appropriate staleTime/refetchInterval

### Page Integration

**Impact page** (`/impact`) — primary integration surface:
- `GuardianMetricsBanner` — replaces hardcoded METRICS array with aggregated verified data
- `GuardianProjectCard` grid — replaces hardcoded PROJECTS array with Guardian VCs
- `TrustChainViewer` — expands inline when user clicks "View Trust Chain" on a project
- ICMA Principles section — each item links to the relevant VC type
- Existing "Coming Soon" MRV card removed — replaced by real data

**Invest page** (`/`) — lighter integration:
- New `AllocationBar` section below existing `BondDetails`
- `VerifiedBadge` linking to Impact page
- Bond Framework summary (eligible categories, SPT description)
- Existing components (`BondDetails`, `ComplianceStatus`, `TransferFlow`, portfolio) unchanged

**Issuer page** (`/issue`) — SPT section:
- `SptStatus` component showing target vs actual tCO2e
- Current coupon rate (normal or penalized)
- Existing issuer controls unchanged

### Trust Chain Viewer Detail

When expanded on a project card, shows connected nodes:

```
Bond Framework VC (signed by Issuer)
  +-- Project Registration VC (signed by Issuer)
      +-- Project Validation (signed by Verifier)
          +-- Fund Allocation VC (references Hedera tx hash)
              +-- Allocation Verification (signed by Verifier)
                  +-- MRV Monitoring Report (signed by Issuer)
                      +-- Verification Statement (signed by Verifier)
```

Each node displays: VC type, summary text, signer (Issuer vs Verifier), timestamp, "View on HashScan" link, "View on IPFS" link.

## 4. Setup & Demo Scripts

All scripts in `scripts/guardian/`, using `fetch` to call Guardian REST API. Credentials loaded from `.env.guardian`.

### Script 1: `guardian-setup.ts` (one-time)

1. Register Standard Registry account on Guardian
2. Configure SR profile with Hedera ED25519 operator credentials
3. Create all 5 schemas via `POST /api/v1/schemas`
4. Publish each schema via `PUT /api/v1/schemas/{id}/publish`
5. Create "CPC Green Bond MRV" policy with block structure via `POST /api/v1/policies`
6. Publish policy via `PUT /api/v1/policies/{id}/publish` (creates HCS topics on testnet)
7. Register Bond Issuer and Verifier user accounts
8. Output: policy ID, topic IDs, user credentials saved to `.env.guardian`

### Script 2: `guardian-populate.ts` (populates demo data)

As Bond Issuer:
1. Submit Bond Framework VC
2. Submit 3 Project Registrations:
   - Sunridge Solar Farm (50 MW, Solar PV, Nairobi, Kenya)
   - Baltic Wind Park (120 MW, Onshore Wind, Tallinn, Estonia)
   - AquaPure Reclamation (Water treatment, Singapore)
3. Submit Fund Allocations referencing real eUSD transfer tx IDs
4. Submit MRV Monitoring Reports for each project

As Verifier:
5. Approve each project registration
6. Approve each fund allocation
7. Approve each MRV report (creating Verification Statement VCs)

Output: list of VC hashes and HCS message timestamps.

### Script 3: `guardian-verify-spt.ts` (coupon penalty check)

1. Query verified MRV VCs from Guardian API
2. Sum total verified tCO2e across all projects
3. Compare against SPT target from Bond Framework VC (10,000 tCO2e)
4. If met: coupon stays at 4.25% (rate=425, rateDecimals=4)
5. If missed: coupon steps up to 4.50% (rate=450, rateDecimals=4)
6. Calls `setCoupon()` on ATS bond contract with appropriate rate
7. Output: target vs actual, rate adjustment applied

For the demo: MRV data is populated to deliberately fall short for one period, showing the penalty in action.

## 5. Testing Strategy

### Unit Tests (vitest)

- `useGuardianProjects` / `useGuardianMRV` hooks — mock API responses, verify VC parsing and aggregation
- `TrustChainViewer` component — mock VC data, verify correct rendering of chain nodes, badges, links
- `AllocationBar` component — verify percentage calculation, rendering
- `SptStatus` component — verify target vs actual display, penalty state
- Guardian API route — mock fetch to Guardian, verify response transformation and error handling
- SPT calculation logic — given verified MRV VCs + a target, verify pass/fail and rate adjustment

### E2E Tests (Playwright) — Mock Suite

Runs against mocked Guardian API responses for CI speed:

**Impact page:**
- Verified metrics banner shows aggregated values (not zeros, not hardcoded)
- Project cards show name, category badge, location, capacity from VCs
- Projects with Verifier approval show "Verified" badge; without show "Pending"
- Metric totals are consistent (banner total = sum of project values)
- Clicking "View Trust Chain" expands inline chain viewer
- Trust chain shows correct number of nodes in correct order
- Each node displays signer, timestamp, VC type
- HashScan links are well-formed URLs
- IPFS links are well-formed
- Closing trust chain collapses cleanly
- Renewable energy projects show MWh and MW in core indicators
- Water project shows m3 and reduction % in core indicators
- Additional indicators render when present

**Invest page:**
- Allocation bar shows percentage between 0-100%
- Allocation breakdown lists projects with correct amounts
- "Guardian Verified" badge links to Impact page
- Bond Framework summary shows eligible categories and SPT

**Cross-page:**
- Guardian Verified badge on Invest navigates to Impact
- Trust chain links resolve correctly

**Error handling:**
- Guardian unreachable: Impact page shows graceful fallback, not crash
- No VCs populated: empty state displayed

**SPT flow:**
- Issuer page shows SPT target vs actual tCO2e
- Target met: coupon rate shows 4.25%
- Target missed: coupon rate shows 4.50% (penalty)

### E2E Tests — `@live` Suite

Tagged `@live`, runs against real Guardian instance on `195.201.8.147`:
- Same test scenarios as mock suite but hitting real Guardian API
- Verifies real HCS messages exist on testnet
- Verifies IPFS CIDs resolve to actual VC documents
- Run manually before demo, not in CI

## 6. Sustainability Performance Target (SPT) Flow

**Setup (in Bond Framework VC):**
- Target: "Avoid 10,000 tCO2e per coupon period across all funded projects"
- Penalty: +25 basis points (0.25%) coupon step-up if target missed

**At coupon time:**
1. `guardian-verify-spt.ts` queries Guardian for Verification Statement VCs in current period
2. Sums `verifiedGHGReduced` across all projects
3. Compares against SPT target
4. If met: `setCoupon()` with base rate (425/10^4 = 4.25%)
5. If missed: `setCoupon()` with penalty rate (450/10^4 = 4.50%)
6. LCCF distributes at whichever rate was set

**Demo strategy:** Populate MRV data that falls short for one period, demonstrating the penalty mechanism live.

## 7. Follow-up Tasks (end of implementation)

1. **DNS + HTTPS:** Configure `guardian.coppice.cc` A record pointing to `195.201.8.147`. Update HAProxy on server to terminate TLS (Let's Encrypt cert) and proxy to Guardian port 3100. Verify `https://guardian.coppice.cc/api/v1/` works.

2. **Vercel domain:** Configure `coppice.cc` on Vercel for the Next.js frontend. Set `GUARDIAN_API_URL=https://guardian.coppice.cc` as Vercel env var.

3. **ED25519 operator account:** Create a new Hedera testnet account with ED25519 keys for Guardian operator. Store credentials securely.
