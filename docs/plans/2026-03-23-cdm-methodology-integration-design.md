# CDM Methodology Integration Design

## Goal

Import a CDM methodology policy from Guardian's open-source Methodology Library onto a second Guardian instance, populate it with demo data linking to the existing "Sunridge Solar Farm" bond project, and show a dual trust chain on the Impact page — bond allocation (Instance 1) and carbon methodology verification (Instance 2) converging on the same project via Hedera testnet.

## Approach

Try CDM AMS-I.F ("Renewable Electricity Generation for Captive Use and Mini-Grid") first. If schema population fails due to Tool 16's 107-field calculation chain, fall back to iREC 7 (simpler, 0 tools). Frontend work is identical either way.

## Infrastructure

### Second Guardian Instance

- Same VPS (195.201.8.147), 54GB RAM free
- Port 3200 (API), 27018 (Mongo), 4223 (NATS), 5002 (IPFS API), 8081 (IPFS Gateway)
- Docker compose derived from existing quickstart with port offsets and unique container names
- TLS: guardian2.coppice.cc via HAProxy (new backend)
- Separate Hedera operator account (ED25519, funded from deployer)

### Deployment is manual (documented in README), all Guardian API interactions are scripted in TypeScript.

## Scripts (all in `scripts/guardian/`)

Following existing patterns: TypeScript, `GuardianClient`, `.env`-based config.

| Script | Purpose |
|--------|---------|
| `create-operator.ts` | Already exists — reuse with different .env target |
| `cdm-import.ts` | Imports AMS-I.F (or iREC 7 fallback) via IPFS timestamp, registers SR, publishes policy, creates users |
| `cdm-discover-schema.ts` | Previews imported policy, dumps block tree + schema fields to JSON for reference |
| `cdm-populate.ts` | Drives the CDM workflow: PP profile → project → monitoring report → VVB verify → SR approve → CER mint |
| `cdm-demo-data.ts` | Demo data constants for "Sunridge Solar Farm" as a CDM project |
| `.env.cdm` | Credentials for the second Guardian instance |
| `.env.cdm.example` | Template |

### Key difference from existing setup

We do NOT create a custom policy. We import a pre-built policy via `POST /api/v1/policies/import/message` and publish it as-is. The policy brings its own schemas and block structure.

### Workflow driven via block tags

The imported policy uses `interfaceStepBlock` (step-based progression), not our flat container pattern. The populate script must:

1. Login as PP, POST to `create_pp_profile` tag (step 1)
2. Wait for SR approval (poll or directly approve as SR)
3. Login as PP, POST to `add_project_bnt` tag (project submission)
4. Tool 16 + customLogicBlock run automatically after submission
5. Login as SR, POST to `sr_validate_project_btn` tag
6. Login as PP, POST to `add_report_bnt` tag (monitoring report)
7. Login as PP, POST to `assign_vvb` tag (assign VVB)
8. Login as VVB, POST to `approve_report_btn` tag
9. Login as SR, POST to `sr_approve_report_btn` tag → triggers CER mint

### Fallback to iREC 7

If AMS-I.F fails at step 3/4 (Tool 16 rejects data), switch to iREC 7:
- IPFS timestamp: `1707130249.448431277`
- 8 schemas, 0 tools, 1 role (Registrant)
- Workflow: register device → issue request → I-REC token mint
- Same script structure, different demo data and tags

## Frontend

### New files (no modifications to existing files except impact page)

| File | Purpose |
|------|---------|
| `frontend/app/api/guardian/cdm/route.ts` | API route fetching from Instance 2 |
| `frontend/hooks/use-cdm.ts` | React Query hook for CDM data |
| `frontend/lib/cdm-types.ts` | Types for CDM credential subjects |
| `frontend/components/guardian/dual-trust-chain.tsx` | The convergence view |

### Impact page modification

Add `<DualTrustChain />` component between Project Portfolio and ICMA Compliance Evidence sections. ~5 lines changed in `impact/page.tsx`.

### Cross-Guardian integration proof

The `DualTrustChain` component shows:

1. **Bond Trust Chain** (from Instance 1): Bond Framework VC → Project Registration VC → Fund Allocation VC, with HCS topic IDs, IPFS CIDs, issuer DIDs
2. **Carbon Trust Chain** (from Instance 2): CDM Project Description VC → Monitoring Report VC → VVB Verification → CER Token, with its own HCS topic IDs, IPFS CIDs, issuer DIDs
3. **Hedera as neutral layer**: Both chains are on testnet. Mirror Node URLs for each HCS topic. Two independent Standard Registries, two different DIDs, two separate topic trees — independently verifiable — converging on "Sunridge Solar Farm"

## Execution Order

1. Deploy second Guardian instance on VPS (manual)
2. Run `cdm-discover-schema.ts` to extract schema fields
3. Build demo data in `cdm-demo-data.ts`
4. Run `cdm-import.ts` to import + publish policy
5. Run `cdm-populate.ts` to drive workflow
6. **If steps 3-5 fail for AMS-I.F, repeat with iREC 7**
7. Only after scripts succeed: build frontend integration
8. Tests (unit + E2E)

## Critical Constraint

All work happens in a git worktree. The production Guardian instance (guardian.coppice.cc) must not be touched.
