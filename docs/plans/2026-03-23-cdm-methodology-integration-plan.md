# CDM Methodology Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Import CDM AMS-I.F methodology policy onto a second Guardian instance, populate it with demo data for "Sunridge Solar Farm", and show a dual trust chain on the Impact page.

**Architecture:** Two Guardian instances on the same VPS, both on Hedera testnet. Instance 1 runs the existing CPC Green Bond MRV policy. Instance 2 runs the imported CDM methodology. The frontend queries both and shows converging trust chains. Scripts-first: prove Guardian integration works before touching frontend.

**Tech Stack:** TypeScript scripts (GuardianClient, @hashgraph/sdk), Next.js API routes, React Query, Tailwind CSS.

**Critical constraints:**
- All work in a git worktree — never modify main working directory
- Never touch the production Guardian instance (guardian.coppice.cc port 3100)
- The second Guardian instance runs on port 3200 on the same VPS
- `GuardianClient` in `scripts/guardian/api-client.ts` reads `GUARDIAN_API_URL` from env — CDM scripts must use `.env.cdm` which points at port 3200
- If AMS-I.F fails due to Tool 16 schema complexity, fall back to iREC 7 (timestamp `1707130249.448431277`)

---

## Phase 1: Infrastructure (VPS setup — manual SSH)

### Task 1: Deploy second Guardian instance on VPS

This task cannot be automated via scripts — it requires SSH to the VPS and Docker operations.

**Step 1: SSH to VPS and check existing setup**

```bash
ssh bawler@195.201.8.147
ls /home/bawler/guardian/
cat /home/bawler/guardian/docker-compose-quickstart.yml | head -30
```

**Step 2: Create a second docker-compose file**

Copy the existing quickstart compose file and modify ALL port mappings and container names. The key changes:
- Container name prefix: `guardian-cdm-` instead of `guardian-quickstart-`
- API gateway: `3200:3000` (was `3100:3000`)
- MongoDB: `27018:27017` (was `27017:27017`)
- NATS: `4223:4222` (was `4222:4222`)
- IPFS API: `5002:5001` (was `5001:5001`)
- IPFS Gateway: `8081:8080` (was `8080:8080`)
- Different volume names (prefix `cdm-` to avoid conflicts)
- Different network name: `guardian-cdm_default`

Save as `/home/bawler/guardian/docker-compose-cdm.yml`.

**Step 3: Start the second instance**

```bash
cd /home/bawler/guardian
docker compose -f docker-compose-cdm.yml up -d
```

Wait 60s for services to initialize, then verify:

```bash
curl -s http://localhost:3200/api/v1/accounts/session | head -20
```

Expected: JSON response (even if 401) confirming the API is up.

**Step 4: Add HAProxy backend for guardian2.coppice.cc**

Edit `/etc/haproxy/haproxy.cfg` to add a second backend:

```
backend guardian2_backend
    server guardian2 127.0.0.1:3200 check
```

Add ACL and routing for `guardian2.coppice.cc`. Reload HAProxy:

```bash
sudo systemctl reload haproxy
```

**Step 5: DNS for guardian2.coppice.cc**

Add an A record pointing `guardian2.coppice.cc` to `195.201.8.147`. Issue TLS cert via acme.sh.

**Step 6: Verify**

```bash
curl -s https://guardian2.coppice.cc/api/v1/accounts/session | head -20
```

**Step 7: Commit nothing** (infrastructure only, no code changes)

---

## Phase 2: Schema Discovery (prove we can talk to Instance 2)

### Task 2: Create `.env.cdm.example` and `.env.cdm`

**Files:**
- Create: `scripts/guardian/.env.cdm.example`
- Create: `scripts/guardian/.env.cdm` (gitignored, populated manually)

**Step 1: Create the example file**

```
# CDM Guardian instance (second instance on port 3200)
# Created by create-operator.ts with CDM_ENV=1 flag
GUARDIAN_API_URL="http://195.201.8.147:3200"

# Hedera operator (ED25519) — separate from Instance 1
GUARDIAN_OPERATOR_ID=""
GUARDIAN_OPERATOR_KEY=""

# Populated by cdm-import.ts
GUARDIAN_POLICY_ID=
GUARDIAN_SR_USERNAME=
GUARDIAN_SR_PASSWORD=
GUARDIAN_PP_USERNAME=
GUARDIAN_PP_PASSWORD=
GUARDIAN_VVB_USERNAME=
GUARDIAN_VVB_PASSWORD=

# Telemetry opt-out
DO_NOT_TRACK=1
```

**Step 2: Create the real `.env.cdm`** with the same template, filling in `GUARDIAN_API_URL`.

**Step 3: Verify `.env.cdm` is gitignored**

Check that `scripts/guardian/.env*` pattern in `.gitignore` covers it. If not, add `scripts/guardian/.env.cdm` to `.gitignore`.

**Step 4: Commit**

```bash
git add scripts/guardian/.env.cdm.example
git commit -m "feat: add .env.cdm.example for second Guardian instance"
```

---

### Task 3: Create `cdm-discover-schema.ts`

**Files:**
- Create: `scripts/guardian/cdm-discover-schema.ts`

This script previews the AMS-I.F policy from IPFS and dumps the full schema + block tree to a JSON file. It targets the PRODUCTION Guardian instance (Instance 1) for the preview — preview doesn't import anything, it just reads from IPFS. This is safe.

**Step 1: Write the script**

The script:
1. Loads `.env.cdm` for the API URL (but preview works on any instance that can read IPFS)
2. Falls back to `https://guardian.coppice.cc` since preview is read-only
3. Logs in as `CoppiceSR` on Instance 1 (preview doesn't need Instance 2 running)
4. POSTs to `/api/v1/policies/import/message/preview` with the AMS-I.F timestamp
5. Extracts all schemas with full field definitions, block tree, tools, tokens
6. Writes to `scripts/guardian/cdm-ams-if-schema.json`

Key code pattern (following existing `api-client.ts` style):

```typescript
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { GuardianClient } from "./api-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use Instance 1 for preview (read-only, safe)
dotenv.config({ path: path.join(__dirname, ".env") });

const AMS_IF_TIMESTAMP = "1720103781.743732003";
const IREC7_TIMESTAMP = "1707130249.448431277";

async function main() {
  const client = new GuardianClient();
  const srUser = process.env.GUARDIAN_SR_USERNAME || "CoppiceSR";
  const srPass = process.env.GUARDIAN_SR_PASSWORD || "CoppiceSR2026!";
  await client.login(srUser, srPass);

  const timestamp = process.argv.includes("--irec") ? IREC7_TIMESTAMP : AMS_IF_TIMESTAMP;
  const label = process.argv.includes("--irec") ? "iREC 7" : "AMS-I.F";

  console.log(`Previewing ${label} (${timestamp})...`);
  const preview = await client.post<Record<string, unknown>>(
    "/api/v1/policies/import/message/preview",
    { messageId: timestamp },
  );

  // Extract and organize
  const output = {
    policy: {
      name: (preview.policy as Record<string,unknown>)?.name,
      description: (preview.policy as Record<string,unknown>)?.description,
      version: (preview.policy as Record<string,unknown>)?.version,
      policyRoles: (preview.policy as Record<string,unknown>)?.policyRoles,
    },
    schemas: preview.schemas,
    tokens: preview.tokens,
    tools: preview.tools,
    blockTree: extractBlockTree((preview.policy as Record<string,unknown>)?.config),
  };

  const outPath = path.join(__dirname,
    process.argv.includes("--irec") ? "cdm-irec7-schema.json" : "cdm-ams-if-schema.json"
  );
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Written to ${outPath}`);
  console.log(`Schemas: ${(preview.schemas as unknown[])?.length}`);
  console.log(`Tools: ${(preview.tools as unknown[])?.length}`);
  console.log(`Tokens: ${(preview.tokens as unknown[])?.length}`);
}

function extractBlockTree(block: unknown, depth = 0): unknown {
  if (!block || typeof block !== "object") return null;
  const b = block as Record<string, unknown>;
  return {
    blockType: b.blockType,
    tag: b.tag || "",
    permissions: b.permissions,
    schema: typeof b.schema === "string" ? b.schema.slice(0, 40) : undefined,
    tokenId: b.tokenId,
    children: Array.isArray(b.children)
      ? b.children.map((c: unknown) => extractBlockTree(c, depth + 1))
      : undefined,
  };
}

main().catch((err) => { console.error("Failed:", err.message); process.exit(1); });
```

**Step 2: Run it**

```bash
cd scripts && npx tsx guardian/cdm-discover-schema.ts
```

Expected: Creates `scripts/guardian/cdm-ams-if-schema.json` with full schema dump. Console shows schema/tool/token counts.

**Step 3: Inspect the output**

Read the JSON and verify:
- All VC-level schemas have field definitions
- Block tree shows tags matching the design (`create_pp_profile`, `add_project_bnt`, etc.)
- Tool 16 schema fields are visible

**Step 4: Also run for iREC 7 (our fallback)**

```bash
cd scripts && npx tsx guardian/cdm-discover-schema.ts --irec
```

**Step 5: Commit**

```bash
git add scripts/guardian/cdm-discover-schema.ts
git commit -m "feat: add CDM schema discovery script"
```

Note: Do NOT commit the JSON output files — they're large reference files.

---

## Phase 3: Second Instance Setup (create operator, register SR)

### Task 4: Create operator account for Instance 2

**Files:**
- Modify: `scripts/guardian/create-operator.ts` — add CDM_ENV support OR create a wrapper

The existing `create-operator.ts` writes to `scripts/guardian/.env`. We need it to write to `.env.cdm` instead when creating the CDM operator.

**Approach:** Don't modify the existing script. Instead, run it with an env override:

**Step 1: Create the operator account**

Create a small wrapper that calls the same Hedera account creation logic but writes to `.env.cdm`:

Create `scripts/guardian/create-cdm-operator.ts`:

```typescript
// Creates an ED25519 Hedera testnet account for the CDM Guardian operator
// Writes to .env.cdm (NOT .env — that's for Instance 1)
// Run once: cd scripts && npx tsx guardian/create-cdm-operator.ts

import { Client, AccountCreateTransaction, PrivateKey, Hbar, AccountId } from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  const operatorId = process.env.HEDERA_ACCOUNT_ID;
  const operatorKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!operatorId || !operatorKey) {
    throw new Error("Missing HEDERA_ACCOUNT_ID or DEPLOYER_PRIVATE_KEY in scripts/.env");
  }

  const client = Client.forTestnet();
  const keyHex = operatorKey.startsWith("0x") ? operatorKey.slice(2) : operatorKey;
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromStringECDSA(keyHex));

  const newKey = PrivateKey.generateED25519();
  const tx = await new AccountCreateTransaction()
    .setKey(newKey.publicKey)
    .setInitialBalance(new Hbar(50))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const accountId = receipt.accountId!.toString();
  const derKey = newKey.toStringDer();

  console.log("CDM Guardian Operator Account Created:");
  console.log(`  Account ID: ${accountId}`);
  console.log(`  Private Key (DER): ${derKey}`);

  const envContent = [
    "# CDM Guardian operator (ED25519) — created by create-cdm-operator.ts",
    `GUARDIAN_OPERATOR_ID="${accountId}"`,
    `GUARDIAN_OPERATOR_KEY="${derKey}"`,
    "",
    "# CDM Guardian API (Instance 2, port 3200)",
    `GUARDIAN_API_URL="http://195.201.8.147:3200"`,
    "",
    "# Populated by cdm-import.ts",
    "GUARDIAN_POLICY_ID=",
    "GUARDIAN_SR_USERNAME=",
    "GUARDIAN_SR_PASSWORD=",
    "GUARDIAN_PP_USERNAME=",
    "GUARDIAN_PP_PASSWORD=",
    "GUARDIAN_VVB_USERNAME=",
    "GUARDIAN_VVB_PASSWORD=",
    "",
    "# Telemetry opt-out",
    "DO_NOT_TRACK=1",
  ].join("\n");

  fs.writeFileSync(path.join(__dirname, ".env.cdm"), envContent);
  console.log("\nCredentials saved to scripts/guardian/.env.cdm");
  client.close();
}

main().catch((err) => { console.error("Failed:", err.message); process.exit(1); });
```

**Step 2: Run it** (requires Instance 2 to be running — Task 1 must be done)

```bash
cd scripts && npx tsx guardian/create-cdm-operator.ts
```

Expected: Creates `.env.cdm` with new Hedera account ID and DER key.

**Step 3: Commit**

```bash
git add scripts/guardian/create-cdm-operator.ts
git commit -m "feat: add CDM operator account creation script"
```

---

### Task 5: Create `cdm-import.ts` — register SR, import policy, publish, create users

**Files:**
- Create: `scripts/guardian/cdm-import.ts`

This is the core script. It follows the same pattern as `guardian-setup.ts` but instead of creating a custom policy, it imports an existing one from IPFS.

**Step 1: Write the script**

The script must:
1. Load `.env.cdm` (points at Instance 2, port 3200)
2. Load `../env` (for Hedera funding account)
3. Register SR account on Instance 2 (`CdmSR` / `CdmSR2026!`)
4. Configure SR profile with operator credentials (creates DID + HCS topics)
5. Import policy via `POST /api/v1/policies/push/import/message` (async — returns taskId)
6. Publish the imported policy via `PUT /api/v1/policies/push/{policyId}/publish`
7. Register PP user (`CdmPP` / `CdmPP2026!`), configure profile with parent SR DID
8. Register VVB user (`CdmVVB` / `CdmVVB2026!`), configure profile with parent SR DID
9. Assign policy to both users
10. Save policy ID and credentials to `.env.cdm`

Key differences from `guardian-setup.ts`:
- Uses `postAsync("/api/v1/policies/push/import/message", { messageId: timestamp })` instead of `post("/api/v1/policies", config)`
- No schema creation — the imported policy brings its own
- No `buildPolicyConfig()` — the policy is pre-built
- Supports `--irec` flag to switch to iREC 7 timestamp

The `GuardianClient` reads `GUARDIAN_API_URL` from env at module load time. Since `.env.cdm` sets it to `http://195.201.8.147:3200`, the client will target Instance 2.

**CRITICAL:** The `api-client.ts` loads `.env` at import time (line 9). The CDM scripts must load `.env.cdm` BEFORE importing `api-client.ts`, or override the URL. The cleanest approach: make `GuardianClient` accept a URL parameter in its constructor instead of reading from env at module scope. Add an optional `baseUrl` constructor param.

Actually — looking at `api-client.ts` again, `BASE_URL` is set at module scope from `process.env.GUARDIAN_API_URL`. If `cdm-import.ts` loads `.env.cdm` before importing `api-client.ts`, the env var will be set correctly. But ESM imports are hoisted. So we need to either:
- (a) Modify `GuardianClient` to accept a URL param (breaks existing pattern slightly)
- (b) Create a `cdm-api-client.ts` that loads `.env.cdm` before re-exporting
- (c) Set `process.env.GUARDIAN_API_URL` before any imports

Option (a) is cleanest. Add optional `baseUrl?: string` to constructor. If not provided, falls back to env. Non-breaking change.

**Step 2: Modify `api-client.ts` to accept optional baseUrl**

Change:
```typescript
const BASE_URL = process.env.GUARDIAN_API_URL || "http://195.201.8.147:3100";

export class GuardianClient {
```

To:
```typescript
const DEFAULT_BASE_URL = process.env.GUARDIAN_API_URL || "http://195.201.8.147:3100";

export class GuardianClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_BASE_URL;
  }
```

Then replace all `${BASE_URL}` with `${this.baseUrl}` in the class methods. This is a non-breaking change — existing scripts pass no args and get the same behavior.

**Step 3: Write `cdm-import.ts`** following the `guardian-setup.ts` pattern exactly (register SR, confirm profile, import policy, publish, register users, assign policy, save env).

**Step 4: Run it**

```bash
cd scripts && npx tsx guardian/cdm-import.ts
```

Expected output:
```
=== CDM Guardian Setup ===
1. Registering Standard Registry...
   Registered successfully
2. Configuring SR profile...
   SR profile confirmed
3. Importing AMS-I.F policy from IPFS...
   Policy imported: <policyId>
4. Publishing policy to Hedera testnet...
   Policy published
5. Registering user accounts...
   CdmPP registered and configured
   CdmVVB registered and configured
6. Assigning policy to users...
   Done
=== Setup Complete ===
Policy ID: <id>
Credentials saved to scripts/guardian/.env.cdm
```

This may take 5-15 minutes (profile confirmation + policy publish).

**Step 5: Commit**

```bash
git add scripts/guardian/api-client.ts scripts/guardian/cdm-import.ts
git commit -m "feat: add CDM policy import script with GuardianClient baseUrl support"
```

---

## Phase 4: Populate Demo Data (the make-or-break phase)

### Task 6: Create `cdm-demo-data.ts` for AMS-I.F

**Files:**
- Create: `scripts/guardian/cdm-demo-data.ts`

This file contains the demo data constants for Sunridge Solar Farm as a CDM project under AMS-I.F. The field names come from the schema discovery output (Task 3).

**Step 1: Build the demo data**

The Project Description requires:
- `field0`: Project Details sub-schema (27 required fields)
- `field1`: `"Other Systems"` (baseline emissions enum — solar displaces grid electricity)
- `field2`: `"Other Renewable Energy"` (activity emissions enum — solar PV)
- `field11`: `4200` (Net Electricity Displaced - Retrofit, MWh — matches existing Sunridge MRV data)
- `field12`: `0` (Net Electricity Displaced - Non Retrofit, MWh)
- Optional computed fields: `field15` (emission reductions), `field16` (baseline), `field17` (project), `field18` (leakage) — leave as 0, customLogicBlock may compute these

Project Details (`field0`) sub-schema:
```typescript
{
  field0: "50MW solar photovoltaic power plant in Nairobi, Kenya...",
  field1: "Energy industries (renewable/non-renewable sources)",
  field2: ["Solar PV"],
  field3: ["Greenfield"],
  field4: "Small Scale",
  field5: "-1.2921",
  field6: "36.8219",
  field7: [{ type: "Point", coordinates: [36.8219, -1.2921] }],
  field8: "The project generates renewable electricity...",
  field9: "Sunridge Solar Ltd",
  field10: "Demo Contact",
  field11: "Project Manager",
  field12: "Nairobi, Kenya",
  field13: "+254700000000",
  field14: "demo@sunridgesolar.example",
  field15: ["Sunridge Solar Ltd — 100% ownership"],
  field16: "None",
  field17: "None",
  field18: ["AMS-I.F: Renewable electricity generation for captive use and mini-grid"],
  field19: "2026-01-01",
  field20: [{ field0: "2026-01-01", field1: "2033-12-31" }],
  field21: [{ field0: "2026-01-01", field1: "2026-12-31" }],
  field22: "Continuous metering of electricity generated...",
  field23: "Compliant with all applicable laws in Kenya...",
  field24: "Contributes to SDG 7 (Affordable and Clean Energy)...",
  field25: "Demo project for Coppice Green Bond hackathon",
  field26: [],
}
```

The Monitoring Report uses the SAME structure as Project Description (same schema).

Export constants: `CDM_PP_PROFILE`, `CDM_VVB_PROFILE`, `CDM_PROJECT_DESCRIPTION`, `CDM_MONITORING_REPORT`.

**Step 2: Commit**

```bash
git add scripts/guardian/cdm-demo-data.ts
git commit -m "feat: add CDM AMS-I.F demo data for Sunridge Solar Farm"
```

---

### Task 7: Create `cdm-populate.ts` — drive the CDM workflow

**Files:**
- Create: `scripts/guardian/cdm-populate.ts`

**Step 1: Write the populate script**

Following `guardian-populate.ts` pattern. The key difference: the imported CDM policy uses `interfaceStepBlock` (step-based) and `buttonBlock` (approval buttons), not our flat `requestVcDocumentBlock` pattern.

The workflow (from the block tree extracted in Task 3):

```
Phase 1 (as PP):
  POST /tag/create_pp_profile/blocks → { document: { field0: "Sunridge Solar Ltd" }, ref: null }
  sleep 5s (wait for step to advance)

Phase 2 (as SR):
  GET /tag/pp_grid_sr/blocks → find PP document pending approval
  POST /tag/approve_pp_documents_btn/blocks → approve PP
  sleep 5s

Phase 3 (as VVB):
  POST /tag/create_new_vvb/blocks → { document: { field0: "Demo VVB" }, ref: null }
  sleep 5s

Phase 4 (as SR):
  POST /tag/approve_documents_btn/blocks → approve VVB
  sleep 5s

Phase 5 (as PP):
  POST /tag/add_project_bnt/blocks → { document: CDM_PROJECT_DESCRIPTION, ref: null }
  sleep 10s (Tool 16 + customLogicBlock run here — THIS IS THE MAKE-OR-BREAK MOMENT)

Phase 6 (as SR):
  POST /tag/sr_validate_project_btn/blocks → validate project
  sleep 5s

Phase 7 (as PP):
  POST /tag/add_report_bnt/blocks → { document: CDM_MONITORING_REPORT, ref: null }
  sleep 10s (Tool 16 + customLogicBlock again)

Phase 8 (as PP):
  POST /tag/assign_vvb/blocks → assign VVB to report
  sleep 5s

Phase 9 (as VVB):
  POST /tag/approve_report_btn/blocks → verify report
  sleep 5s

Phase 10 (as SR):
  POST /tag/sr_approve_report_btn/blocks → approve → CER mint triggered
  sleep 10s

Verification:
  GET /tag/vp_grid/blocks → check for minted VPs
  GET /tag/project_grid_sr/blocks → check project status
```

Each POST must handle errors gracefully — log the full error response body so we can debug schema validation failures.

**Step 2: Run it**

```bash
cd scripts && npx tsx guardian/cdm-populate.ts
```

**Expected outcomes:**
- SUCCESS: All phases complete, VPs visible in vp_grid → proceed to frontend
- FAIL at Phase 5 (project submission): Tool 16 rejects data → examine error, try to fix demo data. If unfixable, switch to iREC 7 fallback.

**Step 3: If AMS-I.F fails, switch to iREC 7**

Create `scripts/guardian/irec-demo-data.ts` with iREC-specific data (device registration for Sunridge Solar, issue request). Run `cdm-import.ts --irec` and `cdm-populate.ts --irec`.

iREC 7 workflow is simpler:
```
Phase 1 (as Registrant): Submit device registration
Phase 2 (as SR): Approve device
Phase 3 (as Registrant): Submit issue request
Phase 4 (as SR): Approve → I-REC token mint
```

**Step 4: Commit**

```bash
git add scripts/guardian/cdm-populate.ts
git commit -m "feat: add CDM populate script driving full methodology workflow"
```

---

## Phase 5: Frontend Integration (only after scripts succeed)

### Task 8: Add CDM constants and types

**Files:**
- Modify: `frontend/lib/constants.ts:47-49` — add CDM constants
- Create: `frontend/lib/cdm-types.ts`

**Step 1: Add constants**

Add to `frontend/lib/constants.ts` after the existing Guardian constants:

```typescript
// CDM Guardian API (server-side only — Instance 2)
export const GUARDIAN_CDM_API_URL = (process.env.GUARDIAN_CDM_API_URL || "").trim();
export const GUARDIAN_CDM_POLICY_ID = (process.env.GUARDIAN_CDM_POLICY_ID || "").trim();
```

**Step 2: Create CDM types**

The exact type shapes depend on which policy succeeded (AMS-I.F vs iREC 7). Create `frontend/lib/cdm-types.ts` with:

```typescript
import type { VCEvidence } from "@/lib/guardian-types";

// Minimal type for CDM project data — exact fields depend on which policy was imported
export interface CDMProjectData {
  projectName: string;
  methodology: string;        // "AMS-I.F" or "iREC 7"
  status: string;             // "Registered" | "Validated" | "Verified" | "CERs Issued"
  emissionReductions?: number; // tCO2e (AMS-I.F) or MWh (iREC)
  tokensMinted?: number;
  tokenName: string;           // "CER" or "I-REC"
}

export interface CDMTrustChainItem {
  label: string;               // "Project Description" | "Monitoring Report" | etc.
  evidence: VCEvidence;
}

export interface CDMData {
  policyName: string;
  policyDescription: string;
  project: CDMProjectData | null;
  trustChain: CDMTrustChainItem[];
  srDid: string;              // Standard Registry DID (different from Instance 1)
}
```

**Step 3: Commit**

```bash
git add frontend/lib/constants.ts frontend/lib/cdm-types.ts
git commit -m "feat: add CDM Guardian types and constants"
```

---

### Task 9: Create CDM API route

**Files:**
- Create: `frontend/app/api/guardian/cdm/route.ts`

**Step 1: Write the API route**

Following the exact pattern of `frontend/app/api/guardian/data/route.ts`. Key differences:
- Reads `GUARDIAN_CDM_API_URL` and `GUARDIAN_CDM_POLICY_ID` from env
- Logs in with CDM credentials (`GUARDIAN_CDM_PP_USERNAME`, etc.)
- Fetches viewer blocks using tags discovered from the schema dump
- Returns `CDMData` type

The tags to query depend on which policy was imported. For AMS-I.F:
- `project_grid_sr` — project descriptions (SR view shows all)
- `report_grid_sr` — monitoring reports
- `vp_grid` — minted token VPs

For iREC 7: different tags (discovered from schema dump).

The route extracts:
- Project name (from the Project Description VC's `field0.field9` — organization name, or from field0.field0 — summary)
- Status (from the document's `option.status`)
- VC evidence (hash, topicId, messageId, issuer, proofType)

**Step 2: Add env vars to `frontend/.env`**

```
# CDM Guardian (Instance 2)
GUARDIAN_CDM_API_URL=https://guardian2.coppice.cc
GUARDIAN_CDM_POLICY_ID=<from cdm-import.ts output>
GUARDIAN_CDM_SR_USERNAME=CdmSR
GUARDIAN_CDM_SR_PASSWORD=CdmSR2026!
GUARDIAN_CDM_PP_USERNAME=CdmPP
GUARDIAN_CDM_PP_PASSWORD=CdmPP2026!
```

**Step 3: Test the route locally**

```bash
cd frontend && npm run dev
curl http://localhost:3000/api/guardian/cdm | python3 -m json.tool
```

Expected: JSON with CDM project data, trust chain items, SR DID.

**Step 4: Commit**

```bash
git add frontend/app/api/guardian/cdm/route.ts
git commit -m "feat: add CDM Guardian API route for Instance 2"
```

---

### Task 10: Create CDM hook

**Files:**
- Create: `frontend/hooks/use-cdm.ts`

**Step 1: Write the hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import type { CDMData } from "@/lib/cdm-types";

export function useCDM() {
  return useQuery({
    queryKey: ["cdm-data"],
    queryFn: async (): Promise<CDMData> => {
      const res = await fetch("/api/guardian/cdm");
      if (!res.ok) throw new Error(`CDM API returned ${res.status}`);
      return res.json() as Promise<CDMData>;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
```

**Step 2: Commit**

```bash
git add frontend/hooks/use-cdm.ts
git commit -m "feat: add useCDM hook for CDM Guardian data"
```

---

### Task 11: Create DualTrustChain component

**Files:**
- Create: `frontend/components/guardian/dual-trust-chain.tsx`

**Step 1: Write the component**

The component shows two trust chains side by side (or stacked on mobile), connected by "Sunridge Solar Farm" at the center. Each chain shows:
- Guardian instance badge (Instance 1 / Instance 2)
- SR DID (different for each)
- VC documents with HCS topic IDs, IPFS hashes
- Status badges

Design follows existing patterns: `card-static`, `stat-label`, `StatusBadge`, `font-mono` for hashes/DIDs, `text-bond-green` for links.

The component accepts:
- `bondProject: GuardianProject` (from existing `useGuardian()`)
- `cdmData: CDMData` (from new `useCDM()`)

It renders only when BOTH have data for "Sunridge Solar Farm".

Visual structure:
```
┌─────────────────────────────────────────────────────────┐
│ Cross-Guardian Verification                             │
│ Two independent Guardian instances verifying the same   │
│ project on Hedera testnet                               │
├─────────────────────┬───────────────────────────────────┤
│ Bond Trust Chain     │ Carbon Trust Chain                │
│ guardian.coppice.cc  │ guardian2.coppice.cc              │
│ DID: did:hedera:...  │ DID: did:hedera:...              │
│                      │                                   │
│ Bond Framework VC    │ CDM Project Description VC        │
│  └─ topic: 0.0.xxx  │  └─ topic: 0.0.yyy               │
│  └─ IPFS: Qm...     │  └─ IPFS: Qm...                  │
│                      │                                   │
│ Project Reg VC       │ Monitoring Report VC              │
│  └─ "Sunridge Solar" │  └─ "Sunridge Solar"             │
│                      │                                   │
│ Fund Allocation VC   │ VVB Verification                  │
│  └─ 45,000 eUSD     │  └─ CER Tokens: X,XXX            │
├──────────────────────┴──────────────────────────────────┤
│ Verified on Hedera Testnet via Mirror Node              │
│ Both chains independently verifiable at:                │
│ testnet.mirrornode.hedera.com                           │
└─────────────────────────────────────────────────────────┘
```

**Step 2: Commit**

```bash
git add frontend/components/guardian/dual-trust-chain.tsx
git commit -m "feat: add DualTrustChain component showing cross-Guardian verification"
```

---

### Task 12: Add DualTrustChain to Impact page

**Files:**
- Modify: `frontend/app/impact/page.tsx:1-10` (add imports)
- Modify: `frontend/app/impact/page.tsx:143-144` (add component between Project Portfolio and ICMA)

**Step 1: Add imports**

```typescript
import { DualTrustChain } from "@/components/guardian/dual-trust-chain";
import { useCDM } from "@/hooks/use-cdm";
```

**Step 2: Add hook call**

Inside `ImpactPage()`, after the existing `useGuardian()` call:

```typescript
const { data: cdmData } = useCDM();
```

**Step 3: Add component render**

After the Project Portfolio section (line 143) and before ICMA Compliance Evidence (line 146):

```typescript
{/* Cross-Guardian Verification */}
{data && cdmData && cdmData.project && (
  <section {...entranceProps(4)}>
    <DualTrustChain
      bondProject={data.projects.find(p => p.registration.ProjectName === "Sunridge Solar Farm")}
      cdmData={cdmData}
    />
  </section>
)}
```

Update the entrance animation index for ICMA section from `entranceProps(4)` to `entranceProps(5)`.

**Step 4: Run lint and build**

```bash
npm run lint && npm run build
```

**Step 5: Commit**

```bash
git add frontend/app/impact/page.tsx
git commit -m "feat: add DualTrustChain to Impact page"
```

---

## Phase 6: Tests

### Task 13: Unit tests for CDM API route

**Files:**
- Create: `frontend/__tests__/api/guardian-cdm.test.ts`

Test the API route with mocked Guardian responses. Verify it returns correct CDMData shape, handles Instance 2 being down gracefully, and extracts trust chain evidence correctly.

### Task 14: Unit test for DualTrustChain component

**Files:**
- Create: `frontend/__tests__/components/dual-trust-chain.test.tsx`

Test rendering with both chains present, with only bond chain, with only CDM chain, and with no matching project name.

### Task 15: E2E test for CDM integration

**Files:**
- Create: `e2e/tests/cdm-methodology.spec.ts`

Test that the Impact page shows the DualTrustChain section when CDM data is available. Mock the CDM API response (since Instance 2 may not be accessible from CI).

### Task 16: Final verification

**Step 1:** Run full test suite

```bash
npm run lint && npm run build && npm run test:unit
```

**Step 2:** Run E2E tests locally

```bash
cd e2e && npx playwright test cdm-methodology
```

**Step 3:** Verify on local dev server

```bash
cd frontend && npm run dev
```

Open http://localhost:3000/impact and verify the DualTrustChain section renders.

**Step 4:** Final commit

```bash
git add -A
git commit -m "test: add unit and E2E tests for CDM methodology integration"
```

---

## Phase 7: Environment Updates

### Task 17: Update env examples and docs

**Files:**
- Modify: `frontend/.env.local.example` — add CDM env vars
- Modify: `scripts/guardian/.env.cdm.example` — finalize with actual var names
- Update `CLAUDE.md` if the CDM integration introduces new key files or commands

**Commit:**

```bash
git commit -m "docs: update env examples for CDM Guardian integration"
```
