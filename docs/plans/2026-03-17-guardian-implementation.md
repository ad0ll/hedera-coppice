# Guardian Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Hedera Guardian into Coppice for verified environmental impact data, fund allocation tracking, and sustainability-linked coupon penalty — replacing the Impact page's mock data with real Guardian Verifiable Credentials.

**Architecture:** Guardian runs on a remote server (bawler@195.201.8.147) via Docker quickstart. Setup scripts create the policy/schemas and populate demo data via Guardian's REST API. The frontend queries Guardian through an API proxy route, displaying verified environmental data with inline trust chain visualization. A sustainability performance target mechanism adjusts the bond's coupon rate based on Guardian-verified environmental outcomes.

**Tech Stack:** Hedera Guardian (Docker), Next.js 16 App Router, ethers v6, TanStack React Query, Tailwind CSS v4, vitest, Playwright

**Design doc:** `docs/plans/2026-03-17-guardian-integration-design.md`

**CRITICAL:** The remote server (`195.201.8.147`) has existing deployments. Do NOT touch: `ntfy` (port 8090), Next.js app (port 3000), app on port 3001, or any directories besides `/home/bawler/guardian/`.

---

## Phase 1: Guardian Infrastructure

### Task 1: Create ED25519 Hedera Testnet Account

Guardian requires ED25519 keys (not ECDSA). Our existing demo wallets are ECDSA. We need a separate Guardian operator account.

**Files:**
- Create: `scripts/guardian/create-operator.ts`
- Create: `scripts/guardian/.env.example`

**Step 1: Create the operator script**

```ts
// scripts/guardian/create-operator.ts
// Creates an ED25519 Hedera testnet account for Guardian operator
// Run once, save credentials to scripts/guardian/.env

import { Client, AccountCreateTransaction, PrivateKey, Hbar } from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const operatorId = process.env.HEDERA_ACCOUNT_ID!;
  const operatorKey = process.env.HEDERA_PRIVATE_KEY!;

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  // Generate ED25519 key pair (Guardian requirement)
  const newKey = PrivateKey.generateED25519();
  const publicKey = newKey.publicKey;

  // Create account with 50 HBAR
  const tx = await new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(new Hbar(50))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const accountId = receipt.accountId!.toString();

  // DER-encoded private key (what Guardian expects)
  const derKey = newKey.toStringDer();

  console.log("Guardian Operator Account Created:");
  console.log(`  Account ID: ${accountId}`);
  console.log(`  Public Key: ${publicKey.toStringDer()}`);
  console.log(`  Private Key (DER): ${derKey}`);

  // Write to .env file
  const envContent = [
    "# Guardian operator (ED25519) - created by create-operator.ts",
    `GUARDIAN_OPERATOR_ID="${accountId}"`,
    `GUARDIAN_OPERATOR_KEY="${derKey}"`,
    "",
    "# Guardian API",
    `GUARDIAN_API_URL="http://195.201.8.147:3100"`,
    "",
    "# Will be populated by guardian-setup.ts",
    "GUARDIAN_POLICY_ID=",
    "GUARDIAN_SR_USERNAME=",
    "GUARDIAN_SR_PASSWORD=",
    "GUARDIAN_ISSUER_USERNAME=",
    "GUARDIAN_ISSUER_PASSWORD=",
    "GUARDIAN_VVB_USERNAME=",
    "GUARDIAN_VVB_PASSWORD=",
  ].join("\n");

  fs.writeFileSync(path.resolve(__dirname, ".env"), envContent);
  console.log("\nCredentials saved to scripts/guardian/.env");

  client.close();
}

main().catch(console.error);
```

**Step 2: Create .env.example**

```
# Guardian operator (ED25519) - created by create-operator.ts
GUARDIAN_OPERATOR_ID=""
GUARDIAN_OPERATOR_KEY=""

# Guardian API
GUARDIAN_API_URL="http://195.201.8.147:3100"

# Populated by guardian-setup.ts
GUARDIAN_POLICY_ID=
GUARDIAN_SR_USERNAME=
GUARDIAN_SR_PASSWORD=
GUARDIAN_ISSUER_USERNAME=
GUARDIAN_ISSUER_PASSWORD=
GUARDIAN_VVB_USERNAME=
GUARDIAN_VVB_PASSWORD=
```

**Step 3: Run the script**

Run: `cd scripts && npx tsx guardian/create-operator.ts`
Expected: Account created, credentials saved to `scripts/guardian/.env`

**Step 4: Commit**

```bash
git add scripts/guardian/create-operator.ts scripts/guardian/.env.example
git commit -m "feat: add Guardian ED25519 operator account creation script"
```

---

### Task 2: Deploy Guardian on Remote Server

**Files:**
- Remote: `/home/bawler/guardian/` (entire Guardian installation)

**Step 1: Clone Guardian repo on server**

Run via SSH:
```bash
ssh bawler@195.201.8.147 "cd /home/bawler && git clone https://github.com/hashgraph/guardian.git"
```
Expected: Repo cloned to `/home/bawler/guardian/`

**Step 2: Configure root .env**

Run via SSH:
```bash
ssh bawler@195.201.8.147 "cat > /home/bawler/guardian/.env << 'ENVEOF'
GUARDIAN_ENV=quickstart
GUARDIAN_VERSION=latest
ENVEOF"
```

**Step 3: Configure Guardian system env**

Edit `configs/.env.quickstart.guardian.system` on the server. The file already exists with defaults. We need to set only `OPERATOR_ID` and `OPERATOR_KEY` (from Task 1's output). Everything else (JWT keys, IPFS local, testnet config, INITIALIZATION_TOPIC_ID=0.0.1960) is already correct in the quickstart defaults.

Run via SSH (substituting actual values from Task 1):
```bash
ssh bawler@195.201.8.147 "cd /home/bawler/guardian && sed -i 's|#OPERATOR_ID=\"\"|OPERATOR_ID=\"<ACCOUNT_ID_FROM_TASK_1>\"|' configs/.env.quickstart.guardian.system && sed -i 's|#OPERATOR_KEY=\"\"|OPERATOR_KEY=\"<DER_KEY_FROM_TASK_1>\"|' configs/.env.quickstart.guardian.system"
```

**Step 4: Remap web-proxy port to avoid conflict with existing port 3000**

Run via SSH:
```bash
ssh bawler@195.201.8.147 "cd /home/bawler/guardian && sed -i \"s|'127.0.0.1:3000:80'|'0.0.0.0:3100:80'|\" docker-compose-quickstart.yml"
```

**Step 5: Start Guardian**

Run via SSH:
```bash
ssh bawler@195.201.8.147 "cd /home/bawler/guardian && docker compose -f docker-compose-quickstart.yml up -d"
```
Expected: 15 containers start. This may take 2-5 minutes for image pulls.

**Step 6: Verify Guardian is running**

Run via SSH:
```bash
ssh bawler@195.201.8.147 "docker compose -f /home/bawler/guardian/docker-compose-quickstart.yml ps --format 'table {{.Name}}\t{{.Status}}'"
```
Expected: All 15 services show "Up" or "running"

Wait ~60 seconds for services to initialize, then test the API:
```bash
curl -s http://195.201.8.147:3100/api/v1/accounts/session | head -c 200
```
Expected: JSON response (even if error, it means the API gateway is responding)

**Step 7: Verify no interference with existing services**

```bash
ssh bawler@195.201.8.147 "docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep ntfy"
```
Expected: ntfy container still running on port 8090, unchanged

**Step 8: Commit a note about the deployment**

No files to commit in our repo for this step — it's server-side only. But update the scripts .env with the correct GUARDIAN_API_URL if needed.

---

### Task 3: Create Guardian Setup Script

This script creates the Standard Registry, schemas, policy, and user accounts on the Guardian instance via REST API.

**Files:**
- Create: `scripts/guardian/guardian-setup.ts`
- Create: `scripts/guardian/schemas.ts` (schema definitions)
- Create: `scripts/guardian/api-client.ts` (Guardian API helper)

**Step 1: Create the API client helper**

```ts
// scripts/guardian/api-client.ts
// Thin wrapper around Guardian REST API

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const BASE_URL = process.env.GUARDIAN_API_URL || "http://195.201.8.147:3100";

export class GuardianClient {
  private accessToken: string | null = null;

  async login(username: string, password: string): Promise<string> {
    const res = await fetch(`${BASE_URL}/api/v1/accounts/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.accessToken;
    return this.accessToken!;
  }

  async register(
    username: string,
    password: string,
    role: "STANDARD_REGISTRY" | "USER"
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/v1/accounts/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, password_confirmation: password, role }),
    });
    if (!res.ok) throw new Error(`Register failed: ${res.status} ${await res.text()}`);
  }

  private authHeaders(): Record<string, string> {
    if (!this.accessToken) throw new Error("Not logged in");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, { headers: this.authHeaders() });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async getTaskResult(taskId: string, maxWaitMs = 120_000): Promise<unknown> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const task = await this.get<{ id: string; expectation: string; result: unknown }>(
        `/api/v1/tasks/${taskId}`
      );
      if (task.expectation === "Completed") return task.result;
      if (task.expectation === "Error") throw new Error(`Task ${taskId} failed: ${JSON.stringify(task.result)}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error(`Task ${taskId} timed out after ${maxWaitMs}ms`);
  }
}
```

**Step 2: Create schema definitions**

```ts
// scripts/guardian/schemas.ts
// Guardian schema definitions grounded in ICMA Harmonised Framework

// Note on schema format: Guardian uses JSON Schema with @context for JSON-LD.
// These are simplified definitions — Guardian wraps them with its own metadata on creation.

export const BOND_FRAMEWORK_SCHEMA = {
  name: "BondFramework",
  description: "Green Bond Framework — root of trust chain. Declares environmental commitments, eligible categories, and sustainability performance target per ICMA GBP.",
  entity: "VC",
  fields: [
    { name: "bondName", title: "Bond Name", type: "string", required: true },
    { name: "bondSymbol", title: "Bond Symbol", type: "string", required: true },
    { name: "isin", title: "ISIN", type: "string", required: true },
    { name: "issuer", title: "Issuer", type: "string", required: true },
    { name: "currency", title: "Currency", type: "string", required: true },
    { name: "totalIssuanceAmount", title: "Total Issuance Amount", type: "number", required: true },
    { name: "couponRate", title: "Coupon Rate", type: "string", required: true },
    { name: "maturityDate", title: "Maturity Date", type: "string", required: true },
    { name: "couponStepUpBps", title: "Coupon Step-Up (bps)", type: "number", required: true, description: "Basis points penalty if SPT missed" },
    { name: "sustainabilityPerformanceTarget", title: "Sustainability Performance Target", type: "string", required: true },
    { name: "eligibleCategories", title: "Eligible ICMA Categories", type: "string", required: true, description: "Comma-separated ICMA categories" },
    { name: "reportingStandard", title: "Reporting Standard", type: "string", required: true },
    { name: "regulatoryFrameworks", title: "Regulatory Frameworks", type: "string", required: false, description: "Comma-separated frameworks" },
    { name: "taxonomyAlignmentPercent", title: "EU Taxonomy Alignment %", type: "number", required: false },
    { name: "bondContractAddress", title: "Bond Contract Address", type: "string", required: true },
    { name: "lifecycleCashFlowAddress", title: "LCCF Contract Address", type: "string", required: true },
    { name: "externalReviewProvider", title: "External Review Provider", type: "string", required: false },
  ],
};

export const PROJECT_REGISTRATION_SCHEMA = {
  name: "ProjectRegistration",
  description: "Green project funded by bond proceeds. Fields map to ICMA Harmonised Framework template columns A-I. Optional EU Taxonomy Tier 1 classification.",
  entity: "VC",
  fields: [
    { name: "projectName", title: "Project Name", type: "string", required: true, description: "ICMA col C" },
    { name: "icmaCategory", title: "ICMA Category", type: "string", required: true, description: "ICMA col A: Renewable Energy, Sustainable Water Management, etc." },
    { name: "subCategory", title: "Sub Category", type: "string", required: true, description: "ICMA col B: Solar PV, Onshore Wind, Water Treatment, etc." },
    { name: "country", title: "Country", type: "string", required: true },
    { name: "location", title: "Location", type: "string", required: true },
    { name: "capacity", title: "Capacity", type: "number", required: true },
    { name: "capacityUnit", title: "Capacity Unit", type: "string", required: true, description: "MW, MWh, m3/day" },
    { name: "projectLifetimeYears", title: "Project Lifetime (years)", type: "number", required: true, description: "ICMA col I" },
    { name: "annualTargetCO2e", title: "Annual Target CO2e (tonnes)", type: "number", required: true, description: "SPT enforcement target (blockchain addition)" },
    { name: "taxonomyActivityId", title: "EU Taxonomy Activity ID", type: "string", required: false, description: "e.g. 4.1 (Solar PV)" },
    { name: "naceCode", title: "NACE Code", type: "string", required: false, description: "e.g. D35.11" },
    { name: "environmentalObjective", title: "EU Environmental Objective", type: "string", required: false },
    { name: "taxonomyAlignmentStatus", title: "Taxonomy Alignment Status", type: "string", required: false, description: "aligned, eligible_not_aligned, not_eligible" },
  ],
};

export const FUND_ALLOCATION_SCHEMA = {
  name: "FundAllocation",
  description: "Records bond proceeds allocated to a project. References on-chain eUSD transfer — independently verifiable on HashScan.",
  entity: "VC",
  fields: [
    { name: "projectName", title: "Project Name", type: "string", required: true },
    { name: "signedAmountEUSD", title: "Signed Amount (eUSD)", type: "number", required: true, description: "ICMA col D: Total committed" },
    { name: "allocatedAmountEUSD", title: "Allocated Amount (eUSD)", type: "number", required: true, description: "ICMA col H: Actually transferred" },
    { name: "shareOfFinancing", title: "Share of Financing (%)", type: "number", required: true, description: "ICMA col E" },
    { name: "allocationDate", title: "Allocation Date", type: "string", required: true },
    { name: "purpose", title: "Purpose", type: "string", required: true, description: "Equipment Procurement, Construction, Operations" },
    { name: "hederaTransactionId", title: "Hedera Transaction ID", type: "string", required: true, description: "On-chain eUSD transfer proof (blockchain addition)" },
  ],
};

export const MRV_REPORT_SCHEMA = {
  name: "MRVMonitoringReport",
  description: "Environmental outcome data using ICMA Core Indicators. Single schema across all project categories — icmaCategory determines which core indicators apply. annualGHGReduced (tCO2e) is universal across ALL ICMA categories.",
  entity: "VC",
  fields: [
    { name: "projectName", title: "Project Name", type: "string", required: true },
    { name: "icmaCategory", title: "ICMA Category", type: "string", required: true },
    { name: "reportingPeriodStart", title: "Reporting Period Start", type: "string", required: true },
    { name: "reportingPeriodEnd", title: "Reporting Period End", type: "string", required: true },
    { name: "annualGHGReduced", title: "Annual GHG Reduced (tCO2e)", type: "number", required: true, description: "ICMA Core #1 — universal" },
    { name: "methodology", title: "Methodology", type: "string", required: true, description: "e.g. IEA Grid Emission Factor 2025" },
    { name: "reportingStandard", title: "Reporting Standard", type: "string", required: true, description: "ICMA Harmonised Framework 2024" },
    // Core indicators are category-specific, stored as JSON string of {name,value,unit}[] array
    // Renewable Energy: [{name:"Annual Energy Generated",value:4200,unit:"MWh"},{name:"Capacity Installed",value:50,unit:"MW"}]
    // Water: [{name:"Water Saved",value:50000,unit:"m3"},{name:"Wastewater Treated",value:30000,unit:"m3"},{name:"Water Reduction",value:15,unit:"%"}]
    { name: "coreIndicators", title: "Core Indicators (JSON)", type: "string", required: true, description: "JSON array of {name,value,unit} — category-specific ICMA Core Indicators" },
    // Optional sustainability indicators (ICMA optional): households served, jobs created, etc.
    { name: "additionalIndicators", title: "Additional Indicators (JSON)", type: "string", required: false, description: "JSON array of {name,value,unit} — optional ICMA sustainability indicators" },
  ],
};

export const VERIFICATION_STATEMENT_SCHEMA = {
  name: "VerificationStatement",
  description: "Independent Verifier (VVB) assessment of an MRV report. Confirmed figures may differ from issuer's claimed values.",
  entity: "VC",
  fields: [
    { name: "projectName", title: "Project Name", type: "string", required: true },
    { name: "reportingPeriod", title: "Reporting Period", type: "string", required: true },
    { name: "verifiedGHGReduced", title: "Verified GHG Reduced (tCO2e)", type: "number", required: true },
    { name: "opinion", title: "Opinion", type: "string", required: true, description: "Approved, Conditional, Rejected" },
    { name: "verifiedCoreIndicators", title: "Verified Core Indicators (JSON)", type: "string", required: false, description: "JSON array of {name,value,unit}" },
    { name: "verifierNotes", title: "Verifier Notes", type: "string", required: false },
  ],
};

export const ALL_SCHEMAS = [
  BOND_FRAMEWORK_SCHEMA,
  PROJECT_REGISTRATION_SCHEMA,
  FUND_ALLOCATION_SCHEMA,
  MRV_REPORT_SCHEMA,
  VERIFICATION_STATEMENT_SCHEMA,
];
```

**Step 3: Create the setup script**

This is a complex script that interacts with Guardian's API to create accounts, schemas, and the policy. Due to Guardian's async task-based API, many operations return a task ID that must be polled for completion.

```ts
// scripts/guardian/guardian-setup.ts
// One-time setup: creates Standard Registry, schemas, policy, and user accounts
// Requires: Guardian running at GUARDIAN_API_URL with OPERATOR_ID/KEY configured
// Outputs: Updates scripts/guardian/.env with policy ID and user credentials

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { GuardianClient } from "./api-client";
import { ALL_SCHEMAS } from "./schemas";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const SR_USERNAME = "CoppiceSR";
const SR_PASSWORD = "CoppiceSR2026!";
const ISSUER_USERNAME = "BondIssuer";
const ISSUER_PASSWORD = "BondIssuer2026!";
const VVB_USERNAME = "GreenVVB";
const VVB_PASSWORD = "GreenVVB2026!";

async function main() {
  const client = new GuardianClient();
  const operatorId = process.env.GUARDIAN_OPERATOR_ID;
  const operatorKey = process.env.GUARDIAN_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error("GUARDIAN_OPERATOR_ID and GUARDIAN_OPERATOR_KEY must be set in scripts/guardian/.env");
  }

  console.log("=== Guardian Setup ===\n");

  // 1. Register Standard Registry
  console.log("1. Registering Standard Registry account...");
  await client.register(SR_USERNAME, SR_PASSWORD, "STANDARD_REGISTRY");
  await client.login(SR_USERNAME, SR_PASSWORD);
  console.log("   Logged in as Standard Registry\n");

  // 2. Configure SR profile with Hedera credentials
  console.log("2. Configuring SR profile with Hedera operator...");
  await client.put(`/api/v1/profiles/${SR_USERNAME}`, {
    hederaAccountId: operatorId,
    hederaAccountKey: operatorKey,
    vcDocument: {
      geography: "Global",
      law: "ICMA",
      tags: "Green Bonds, MRV, ICMA",
      ISIC: "D3510", // Electricity generation
      type: "Coppice Green Bond Standard Registry",
    },
  });
  // Profile setup is async — wait for it to complete
  console.log("   Waiting for profile initialization (this creates DID + HCS topics)...");
  // Poll the profile until it's ready
  let profileReady = false;
  for (let i = 0; i < 60; i++) {
    const profile = await client.get<{ confirmed: boolean }>(`/api/v1/profiles/${SR_USERNAME}`);
    if (profile.confirmed) {
      profileReady = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
    process.stdout.write(".");
  }
  if (!profileReady) throw new Error("Profile initialization timed out");
  console.log("\n   SR profile confirmed\n");

  // 3. Create schemas
  console.log("3. Creating schemas...");
  const topicId = (await client.get<{ topicId: string }>(`/api/v1/profiles/${SR_USERNAME}`)).topicId;

  const schemaIds: Record<string, string> = {};
  for (const schema of ALL_SCHEMAS) {
    console.log(`   Creating schema: ${schema.name}...`);
    const created = await client.post<{ id: string }>(`/api/v1/schemas/${topicId}`, {
      name: schema.name,
      description: schema.description,
      entity: schema.entity,
      fields: schema.fields,
    });
    schemaIds[schema.name] = created.id;
    console.log(`   Created: ${created.id}`);
  }
  console.log("");

  // 4. Publish schemas
  console.log("4. Publishing schemas...");
  for (const [name, id] of Object.entries(schemaIds)) {
    console.log(`   Publishing: ${name}...`);
    await client.put(`/api/v1/schemas/${id}/publish`, { version: "1.0.0" });
  }
  console.log("");

  // 5. Create policy
  // Note: The policy block structure is complex. For the hackathon, we create a simplified
  // policy with requestVcDocument blocks for each schema + approval workflow.
  // The exact block JSON structure must match Guardian's API format.
  // This will be refined during implementation based on Guardian's Swagger docs.
  console.log("5. Creating policy: CPC Green Bond MRV...");
  const policy = await client.post<{ id: string }>("/api/v1/policies", {
    name: "CPC Green Bond MRV",
    description: "ICMA-aligned green bond MRV verification policy for Coppice. Verifies fund allocation, environmental impact, and sustainability performance targets.",
    topicDescription: "CPC Green Bond MRV Policy",
    policyTag: "cpc_green_bond_mrv",
    // Policy block structure will be defined here.
    // This requires exploring Guardian's exact block format via Swagger.
    // Placeholder — full block definition added during implementation.
  });
  const policyId = policy.id;
  console.log(`   Policy created: ${policyId}\n`);

  // 6. Publish policy (creates HCS topics on testnet)
  console.log("6. Publishing policy to Hedera testnet...");
  await client.put(`/api/v1/policies/${policyId}/publish`, { policyVersion: "1.0.0" });
  console.log("   Policy published\n");

  // 7. Register user accounts
  console.log("7. Registering user accounts...");
  await client.register(ISSUER_USERNAME, ISSUER_PASSWORD, "USER");
  await client.register(VVB_USERNAME, VVB_PASSWORD, "USER");
  console.log("   Bond Issuer and Verifier accounts registered\n");

  // 8. Save credentials to .env
  const envPath = path.resolve(__dirname, ".env");
  let envContent = fs.readFileSync(envPath, "utf-8");
  envContent = envContent.replace(/GUARDIAN_POLICY_ID=.*/, `GUARDIAN_POLICY_ID="${policyId}"`);
  envContent = envContent.replace(/GUARDIAN_SR_USERNAME=.*/, `GUARDIAN_SR_USERNAME="${SR_USERNAME}"`);
  envContent = envContent.replace(/GUARDIAN_SR_PASSWORD=.*/, `GUARDIAN_SR_PASSWORD="${SR_PASSWORD}"`);
  envContent = envContent.replace(/GUARDIAN_ISSUER_USERNAME=.*/, `GUARDIAN_ISSUER_USERNAME="${ISSUER_USERNAME}"`);
  envContent = envContent.replace(/GUARDIAN_ISSUER_PASSWORD=.*/, `GUARDIAN_ISSUER_PASSWORD="${ISSUER_PASSWORD}"`);
  envContent = envContent.replace(/GUARDIAN_VVB_USERNAME=.*/, `GUARDIAN_VVB_USERNAME="${VVB_USERNAME}"`);
  envContent = envContent.replace(/GUARDIAN_VVB_PASSWORD=.*/, `GUARDIAN_VVB_PASSWORD="${VVB_PASSWORD}"`);
  fs.writeFileSync(envPath, envContent);

  console.log("=== Setup Complete ===");
  console.log(`Policy ID: ${policyId}`);
  console.log(`Credentials saved to scripts/guardian/.env`);
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
```

**Step 4: Run the setup script**

Run: `cd scripts && npx tsx guardian/guardian-setup.ts`
Expected: Standard Registry created, 5 schemas published, policy published to testnet, user accounts registered. Credentials saved to `.env`.

Note: This step requires Guardian to be running (Task 2). Profile initialization can take 1-3 minutes as it creates a DID and HCS topics on testnet.

**Step 5: Commit**

```bash
git add scripts/guardian/api-client.ts scripts/guardian/schemas.ts scripts/guardian/guardian-setup.ts
git commit -m "feat: add Guardian setup script (SR, schemas, policy, users)"
```

---

### Task 4: Create Guardian Data Population Script

Populates the published policy with demo data: Bond Framework, 3 projects, allocations, MRV reports, and Verifier approvals.

**Files:**
- Create: `scripts/guardian/guardian-populate.ts`
- Create: `scripts/guardian/demo-data.ts`

**Step 1: Create demo data definitions**

```ts
// scripts/guardian/demo-data.ts
// Demo data for Guardian population — grounded in ICMA with blockchain additions

export const BOND_FRAMEWORK = {
  bondName: "Coppice Green Bond",
  bondSymbol: "CPC",
  isin: "XS0000000009",
  issuer: "Coppice Finance",
  currency: "eUSD",
  totalIssuanceAmount: 100000,
  couponRate: "4.25%",
  maturityDate: "2028-03-15",
  couponStepUpBps: 25,
  sustainabilityPerformanceTarget: "Avoid 10,000 tCO2e per coupon period across all funded projects",
  eligibleCategories: "Renewable Energy, Sustainable Water Management",
  reportingStandard: "ICMA Green Bond Principles (June 2025)",
  regulatoryFrameworks: "ICMA GBP June 2025, EU Taxonomy Regulation 2020/852",
  taxonomyAlignmentPercent: 85,
  bondContractAddress: "0xcFbB4b74EdbEB4FE33cD050d7a1203d1486047d9",
  lifecycleCashFlowAddress: "0xC36cd7a8C15B261C1e6D348fB1247D8eCBB8c350",
  externalReviewProvider: "Simulated VVB (Hackathon Demo)",
};

export const PROJECTS = [
  {
    projectName: "Sunridge Solar Farm",
    icmaCategory: "Renewable Energy",
    subCategory: "Solar PV",
    country: "KE",
    location: "Nairobi, Kenya",
    capacity: 50,
    capacityUnit: "MW",
    projectLifetimeYears: 25,
    annualTargetCO2e: 6000,
    taxonomyActivityId: "4.1",
    naceCode: "D35.11",
    environmentalObjective: "Climate Change Mitigation",
    taxonomyAlignmentStatus: "aligned",
  },
  {
    projectName: "Baltic Wind Park",
    icmaCategory: "Renewable Energy",
    subCategory: "Onshore Wind",
    country: "EE",
    location: "Tallinn, Estonia",
    capacity: 120,
    capacityUnit: "MW",
    projectLifetimeYears: 20,
    annualTargetCO2e: 8000,
    taxonomyActivityId: "4.3",
    naceCode: "D35.11",
    environmentalObjective: "Climate Change Mitigation",
    taxonomyAlignmentStatus: "aligned",
  },
  {
    projectName: "AquaPure Reclamation",
    icmaCategory: "Sustainable Water Management",
    subCategory: "Water Treatment",
    country: "SG",
    location: "Singapore",
    capacity: 50000,
    capacityUnit: "m3/day",
    projectLifetimeYears: 30,
    annualTargetCO2e: 1200,
    taxonomyActivityId: "5.3",
    naceCode: "E36.00",
    environmentalObjective: "Sustainable Use of Water and Marine Resources",
    taxonomyAlignmentStatus: "aligned",
  },
];

export const ALLOCATIONS = [
  {
    projectName: "Sunridge Solar Farm",
    signedAmountEUSD: 45000,
    allocatedAmountEUSD: 45000,
    shareOfFinancing: 45,
    allocationDate: "2026-03-15",
    purpose: "Equipment Procurement & Construction",
    hederaTransactionId: "", // Populated at runtime after real eUSD transfer
  },
  {
    projectName: "Baltic Wind Park",
    signedAmountEUSD: 35000,
    allocatedAmountEUSD: 35000,
    shareOfFinancing: 35,
    allocationDate: "2026-03-15",
    purpose: "Equipment Procurement",
    hederaTransactionId: "",
  },
  {
    projectName: "AquaPure Reclamation",
    signedAmountEUSD: 15000,
    allocatedAmountEUSD: 15000,
    shareOfFinancing: 15,
    allocationDate: "2026-03-16",
    purpose: "Construction & Operations",
    hederaTransactionId: "",
  },
];

// MRV reports — Sunridge and Baltic hit targets, AquaPure falls short
// Total: 1890 + 3200 + 450 = 5540 tCO2e — BELOW 10,000 target (triggers penalty)
export const MRV_REPORTS = [
  {
    projectName: "Sunridge Solar Farm",
    icmaCategory: "Renewable Energy",
    reportingPeriodStart: "2026-01-01",
    reportingPeriodEnd: "2026-06-30",
    annualGHGReduced: 1890,
    methodology: "IEA Grid Emission Factor (Kenya 2025): 0.45 tCO2e/MWh",
    reportingStandard: "ICMA Harmonised Framework 2024",
    coreIndicators: JSON.stringify([
      { name: "Annual Energy Generated", value: 4200, unit: "MWh" },
      { name: "Capacity Installed", value: 50, unit: "MW" },
    ]),
    additionalIndicators: JSON.stringify([
      { name: "Households Served", value: 12500, unit: "households" },
    ]),
  },
  {
    projectName: "Baltic Wind Park",
    icmaCategory: "Renewable Energy",
    reportingPeriodStart: "2026-01-01",
    reportingPeriodEnd: "2026-06-30",
    annualGHGReduced: 3200,
    methodology: "IEA Grid Emission Factor (Estonia 2025): 0.32 tCO2e/MWh",
    reportingStandard: "ICMA Harmonised Framework 2024",
    coreIndicators: JSON.stringify([
      { name: "Annual Energy Generated", value: 10000, unit: "MWh" },
      { name: "Capacity Installed", value: 120, unit: "MW" },
    ]),
    additionalIndicators: JSON.stringify([
      { name: "Jobs Created", value: 84, unit: "FTE" },
    ]),
  },
  {
    projectName: "AquaPure Reclamation",
    icmaCategory: "Sustainable Water Management",
    reportingPeriodStart: "2026-01-01",
    reportingPeriodEnd: "2026-06-30",
    annualGHGReduced: 450,
    methodology: "IPCC Wastewater Treatment Emission Factors 2019",
    reportingStandard: "ICMA Harmonised Framework 2024",
    coreIndicators: JSON.stringify([
      { name: "Water Saved", value: 50000, unit: "m3" },
      { name: "Wastewater Treated", value: 30000, unit: "m3" },
      { name: "Water Reduction", value: 15, unit: "%" },
    ]),
    additionalIndicators: JSON.stringify([
      { name: "Population Served", value: 25000, unit: "people" },
    ]),
  },
];

// Verification statements — Verifier confirms slightly different figures
export const VERIFICATION_STATEMENTS = [
  {
    projectName: "Sunridge Solar Farm",
    reportingPeriod: "2026-H1",
    verifiedGHGReduced: 1850, // Slightly lower than claimed 1890
    opinion: "Approved",
    verifiedCoreIndicators: JSON.stringify([
      { name: "Annual Energy Generated", value: 4110, unit: "MWh" },
      { name: "Capacity Installed", value: 50, unit: "MW" },
    ]),
    verifierNotes: "Minor adjustment to energy generation figure based on meter calibration review. CO2 factor confirmed against IEA 2025 data.",
  },
  {
    projectName: "Baltic Wind Park",
    reportingPeriod: "2026-H1",
    verifiedGHGReduced: 3150,
    opinion: "Approved",
    verifiedCoreIndicators: JSON.stringify([
      { name: "Annual Energy Generated", value: 9840, unit: "MWh" },
      { name: "Capacity Installed", value: 120, unit: "MW" },
    ]),
    verifierNotes: "Verified against SCADA data. Slight reduction in wind yield due to below-average wind speeds in Q1.",
  },
  {
    projectName: "AquaPure Reclamation",
    reportingPeriod: "2026-H1",
    verifiedGHGReduced: 420,
    opinion: "Conditional",
    verifiedCoreIndicators: JSON.stringify([
      { name: "Water Saved", value: 48000, unit: "m3" },
      { name: "Wastewater Treated", value: 28500, unit: "m3" },
      { name: "Water Reduction", value: 14, unit: "%" },
    ]),
    verifierNotes: "Conditional approval: metering infrastructure for secondary treatment line requires upgrade. Current readings have +/- 5% uncertainty.",
  },
];
```

**Step 2: Create the populate script**

This script logs in as Bond Issuer, submits all VCs through the policy workflow, then logs in as Verifier to approve them. The exact API calls depend on the policy's block UUIDs (obtained after publishing in Task 3).

```ts
// scripts/guardian/guardian-populate.ts
// Populates the Guardian policy with demo data
// Run after guardian-setup.ts

import * as dotenv from "dotenv";
import * as path from "path";
import { GuardianClient } from "./api-client";
import { BOND_FRAMEWORK, PROJECTS, ALLOCATIONS, MRV_REPORTS, VERIFICATION_STATEMENTS } from "./demo-data";

dotenv.config({ path: path.resolve(__dirname, ".env") });

async function main() {
  const client = new GuardianClient();
  const policyId = process.env.GUARDIAN_POLICY_ID;
  if (!policyId) throw new Error("GUARDIAN_POLICY_ID not set. Run guardian-setup.ts first.");

  console.log("=== Populating Guardian Demo Data ===\n");

  // --- Phase 1: Submit data as Bond Issuer ---
  console.log("Phase 1: Submitting data as Bond Issuer...\n");
  await client.login(process.env.GUARDIAN_ISSUER_USERNAME!, process.env.GUARDIAN_ISSUER_PASSWORD!);

  // Assign Bond Issuer role in the policy
  const groups = await client.get<Array<{ uuid: string; name: string }>>(`/api/v1/policies/${policyId}/groups`);
  // Find and join the Bond Issuer group
  // (Exact group names depend on policy definition — adjusted during implementation)

  // Get the policy blocks to find submission block UUIDs
  const blocks = await client.get<{ id: string; children: unknown[] }>(`/api/v1/policies/${policyId}/blocks`);
  // Navigate block tree to find requestVcDocumentBlock UUIDs for each schema
  // (Exact navigation depends on policy structure — refined during implementation)

  // Submit Bond Framework
  console.log("  Submitting Bond Framework VC...");
  // POST /api/v1/policies/{policyId}/blocks/{bondFrameworkBlockUUID}
  // body: { document: { ...BOND_FRAMEWORK } }

  // Submit each project registration
  for (const project of PROJECTS) {
    console.log(`  Submitting Project: ${project.projectName}...`);
    // POST to project registration block
  }

  // Submit fund allocations
  for (const allocation of ALLOCATIONS) {
    console.log(`  Submitting Allocation: ${allocation.projectName}...`);
    // POST to fund allocation block
  }

  // Submit MRV reports
  for (const report of MRV_REPORTS) {
    console.log(`  Submitting MRV: ${report.projectName}...`);
    // POST to MRV report block
  }

  // --- Phase 2: Approve as Verifier ---
  console.log("\nPhase 2: Approving as Verifier...\n");
  await client.login(process.env.GUARDIAN_VVB_USERNAME!, process.env.GUARDIAN_VVB_PASSWORD!);

  // Assign Verifier role
  // Get pending documents from InterfaceDocumentsSourceBlock
  // For each: approve via InterfaceActionBlock, which triggers reassigningBlock + sendToGuardianBlock

  // Submit Verification Statements
  for (const statement of VERIFICATION_STATEMENTS) {
    console.log(`  Verifying: ${statement.projectName}...`);
    // Approve the corresponding MRV report
    // Submit verification statement data
  }

  console.log("\n=== Population Complete ===");
  console.log("VCs are now on Hedera testnet. Query via mirror node or Guardian API.");
}

main().catch((err) => {
  console.error("Population failed:", err.message);
  process.exit(1);
});
```

Note: The exact block UUID navigation in this script requires interaction with the live Guardian API after the policy is published. The block tree structure returned by `GET /api/v1/policies/{policyId}/blocks` must be traversed to find the correct submission and approval blocks. This will be refined during implementation by inspecting the actual API responses.

**Step 3: Run the populate script**

Run: `cd scripts && npx tsx guardian/guardian-populate.ts`
Expected: All VCs submitted and approved. Data visible in Guardian UI and queryable via API.

**Step 4: Commit**

```bash
git add scripts/guardian/demo-data.ts scripts/guardian/guardian-populate.ts
git commit -m "feat: add Guardian data population script with ICMA demo data"
```

---

## Phase 2: Frontend — Data Layer

### Task 5: Add Guardian Environment Variables

**Files:**
- Modify: `frontend/.env.local.example`
- Modify: `frontend/lib/constants.ts`

**Step 1: Add Guardian env vars to .env.local.example**

Append to the existing file:
```
# Guardian API (proxied through our API routes)
GUARDIAN_API_URL=http://195.201.8.147:3100
GUARDIAN_SR_USERNAME=CoppiceSR
GUARDIAN_SR_PASSWORD=CoppiceSR2026!
GUARDIAN_POLICY_ID=
```

**Step 2: Add Guardian constants**

Add to `frontend/lib/constants.ts`:
```ts
// Guardian API
export const GUARDIAN_API_URL = process.env.GUARDIAN_API_URL || "http://195.201.8.147:3100";
export const GUARDIAN_POLICY_ID = process.env.GUARDIAN_POLICY_ID || "";
```

**Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/.env.local.example frontend/lib/constants.ts
git commit -m "feat: add Guardian environment variables and constants"
```

---

### Task 6: Create Guardian TypeScript Types

**Files:**
- Create: `frontend/lib/guardian-types.ts`

**Step 1: Define the types**

These types represent the VC data as it will be returned from Guardian API and consumed by our hooks/components. Derived from the schema definitions in `scripts/guardian/schemas.ts`.

```ts
// frontend/lib/guardian-types.ts
// TypeScript types for Guardian VC data — mirrors schema definitions

export interface Indicator {
  name: string;
  value: number;
  unit: string;
}

export interface BondFrameworkVC {
  bondName: string;
  bondSymbol: string;
  isin: string;
  issuer: string;
  currency: string;
  totalIssuanceAmount: number;
  couponRate: string;
  maturityDate: string;
  couponStepUpBps: number;
  sustainabilityPerformanceTarget: string;
  eligibleCategories: string;
  reportingStandard: string;
  regulatoryFrameworks?: string;
  taxonomyAlignmentPercent?: number;
  bondContractAddress: string;
  lifecycleCashFlowAddress: string;
  externalReviewProvider?: string;
}

export interface ProjectRegistrationVC {
  projectName: string;
  icmaCategory: string;
  subCategory: string;
  country: string;
  location: string;
  capacity: number;
  capacityUnit: string;
  projectLifetimeYears: number;
  annualTargetCO2e: number;
  taxonomyActivityId?: string;
  naceCode?: string;
  environmentalObjective?: string;
  taxonomyAlignmentStatus?: "aligned" | "eligible_not_aligned" | "not_eligible";
}

export interface FundAllocationVC {
  projectName: string;
  signedAmountEUSD: number;
  allocatedAmountEUSD: number;
  shareOfFinancing: number;
  allocationDate: string;
  purpose: string;
  hederaTransactionId: string;
}

export interface MRVReportVC {
  projectName: string;
  icmaCategory: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  annualGHGReduced: number;
  methodology: string;
  reportingStandard: string;
  coreIndicators: Indicator[];
  additionalIndicators?: Indicator[];
}

export interface VerificationStatementVC {
  projectName: string;
  reportingPeriod: string;
  verifiedGHGReduced: number;
  opinion: "Approved" | "Conditional" | "Rejected";
  verifiedCoreIndicators?: Indicator[];
  verifierNotes?: string;
}

export type GuardianVCType =
  | "BondFramework"
  | "ProjectRegistration"
  | "FundAllocation"
  | "MRVMonitoringReport"
  | "VerificationStatement";

export interface TrustChainNode {
  type: GuardianVCType;
  summary: string;
  signer: "Issuer" | "Verifier";
  timestamp: string;
  hcsMessageId?: string;
  ipfsCid?: string;
  data: BondFrameworkVC | ProjectRegistrationVC | FundAllocationVC | MRVReportVC | VerificationStatementVC;
}

export interface GuardianProject {
  registration: ProjectRegistrationVC;
  allocation?: FundAllocationVC;
  mrvReport?: MRVReportVC;
  verification?: VerificationStatementVC;
  trustChain: TrustChainNode[];
  isVerified: boolean;
}

export interface GuardianData {
  bondFramework: BondFrameworkVC | null;
  projects: GuardianProject[];
  totalAllocatedEUSD: number;
  totalUnallocatedEUSD: number;
  allocationPercent: number;
  totalVerifiedCO2e: number;
  sptTarget: number;
  sptMet: boolean;
}
```

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/lib/guardian-types.ts
git commit -m "feat: add Guardian TypeScript types for VC data"
```

---

### Task 7: Create Guardian API Proxy Route

**Files:**
- Create: `frontend/app/api/guardian/data/route.ts`
- Create: `frontend/__tests__/api/guardian-data.test.ts`

**Step 1: Write the failing test**

The test verifies that the API route fetches from Guardian, transforms the response, and handles errors.

The exact implementation of this test and route depends on the actual Guardian API response format after the policy is published. The test should mock the fetch to Guardian and verify the transformation logic.

**Step 2: Implement the API route**

The route authenticates with Guardian server-side, queries the policy's documents, and returns structured `GuardianData` to the frontend. It handles Guardian being unreachable gracefully.

**Step 3: Run test, verify pass, commit**

```bash
git add frontend/app/api/guardian/data/route.ts frontend/__tests__/api/guardian-data.test.ts
git commit -m "feat: add Guardian API proxy route"
```

---

### Task 8: Create useGuardian Hook

**Files:**
- Create: `frontend/hooks/use-guardian.ts`
- Create: `frontend/__tests__/hooks/use-guardian.test.ts`

**Step 1: Write the failing test**

Following the pattern from `use-coupons.test.ts`: mock the fetch, render the hook in a QueryClientProvider wrapper, waitFor data, assert on transformed structure.

**Step 2: Implement the hook**

Following the patterns from `use-coupons.ts` and `use-hcs-audit.ts`: uses React Query with appropriate staleTime/refetchInterval, fetches from `/api/guardian/data`, returns typed `GuardianData`.

**Step 3: Run test, verify pass, commit**

```bash
git add frontend/hooks/use-guardian.ts frontend/__tests__/hooks/use-guardian.test.ts
git commit -m "feat: add useGuardian hook for fetching verified environmental data"
```

---

## Phase 3: Frontend — Components

### Task 9: Create VerifiedBadge Component

**Files:**
- Create: `frontend/components/guardian/verified-badge.tsx`
- Create: `frontend/__tests__/components/guardian/verified-badge.test.tsx`

Small reusable component following `ui/status-badge.tsx` pattern. Shows "Guardian Verified" (green), "Pending Verification" (amber), or "Verification Failed" (red) based on a status prop.

**Step 1: Write test, Step 2: Implement, Step 3: Commit**

---

### Task 10: Create GuardianMetricsBanner Component

**Files:**
- Create: `frontend/components/guardian/metrics-banner.tsx`
- Create: `frontend/__tests__/components/guardian/metrics-banner.test.tsx`

Follows the existing metrics banner pattern from `impact/page.tsx` (lines 80-95) but accepts data from props (from `useGuardian` hook) instead of hardcoded arrays. Aggregates verified tCO2e, energy, capacity, and project count.

**Step 1: Write test, Step 2: Implement, Step 3: Commit**

---

### Task 11: Create GuardianProjectCard Component

**Files:**
- Create: `frontend/components/guardian/project-card.tsx`
- Create: `frontend/__tests__/components/guardian/project-card.test.tsx`

Follows the existing project card pattern from `impact/page.tsx` (lines 98-126) but with real data + VerifiedBadge + "View Trust Chain" expand button. Accepts a `GuardianProject` prop.

**Step 1: Write test, Step 2: Implement, Step 3: Commit**

---

### Task 12: Create TrustChainViewer Component

**Files:**
- Create: `frontend/components/guardian/trust-chain-viewer.tsx`
- Create: `frontend/__tests__/components/guardian/trust-chain-viewer.test.tsx`

The most complex new component. Renders a vertical chain of connected nodes, each showing VC type, summary, signer badge, timestamp, and external links (HashScan + IPFS). Accepts a `TrustChainNode[]` prop. Uses `animate-entrance` with staggered `--index`.

Each node shows:
- Left: colored dot + connecting line (green for Issuer, blue for Verifier)
- Center: VC type label, summary text, timestamp
- Right: "HashScan" and "IPFS" link buttons

**Step 1: Write test, Step 2: Implement, Step 3: Commit**

---

### Task 13: Create AllocationBar Component

**Files:**
- Create: `frontend/components/guardian/allocation-bar.tsx`
- Create: `frontend/__tests__/components/guardian/allocation-bar.test.tsx`

Shows "Use of Proceeds" allocation progress. Accepts `totalAllocated`, `totalUnallocated`, `projects` (with allocation amounts). Renders a progress bar + project breakdown table.

**Step 1: Write test, Step 2: Implement, Step 3: Commit**

---

### Task 14: Create SptStatus Component

**Files:**
- Create: `frontend/components/guardian/spt-status.tsx`
- Create: `frontend/__tests__/components/guardian/spt-status.test.tsx`

Shows sustainability performance target status: target tCO2e, actual verified tCO2e, whether target is met, and the resulting coupon rate (normal or penalized). Uses green/red color coding.

**Step 1: Write test, Step 2: Implement, Step 3: Commit**

---

## Phase 4: Frontend — Page Integration

### Task 15: Integrate Guardian into Impact Page

**Files:**
- Modify: `frontend/app/impact/page.tsx`
- Modify: `frontend/__tests__/pages/impact.test.tsx`

Replace the hardcoded mock data with Guardian components:
- Remove hardcoded `METRICS`, `PROJECTS` arrays
- Add `"use client"` directive (needed for hooks)
- Import `useGuardian` hook
- Replace metrics banner section with `<GuardianMetricsBanner>`
- Replace project cards section with `<GuardianProjectCard>` grid
- Add `<TrustChainViewer>` that expands inline on project card click
- Replace "Coming Soon" MRV card with actual data or loading state
- Keep ICMA Principles section (enhance with VC links later)
- Add loading state and error/fallback state for when Guardian is unreachable

**Step 1: Update test to use Guardian mocks instead of static text, Step 2: Implement, Step 3: Run tests, Step 4: Commit**

---

### Task 16: Integrate Guardian into Invest Page

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: existing invest page tests if any

Add a "Use of Proceeds" section below the existing `BondDetails` component:
- Import `useGuardian` hook (page is already `"use client"`)
- Add `<AllocationBar>` component between BondDetails and ComplianceStatus
- Add `<VerifiedBadge>` with link to `/impact`
- Show Bond Framework summary (eligible categories, SPT) if available
- Graceful fallback: if Guardian data is loading or unavailable, hide the section (don't break existing functionality)

**Step 1: Implement, Step 2: Run tests, Step 3: Commit**

---

### Task 17: Integrate Guardian into Issuer Page

**Files:**
- Modify: `frontend/app/issue/page.tsx`

Add SPT status section to the issuer page:
- Import `useGuardian` hook
- Add `<SptStatus>` component after existing coupon management section
- Shows: target vs actual tCO2e, current coupon rate, penalty status
- Only visible to connected issuer (same gate as existing issuer controls)

**Step 1: Implement, Step 2: Run tests, Step 3: Commit**

---

## Phase 5: SPT Coupon Penalty Script

### Task 18: Create SPT Verification Script

**Files:**
- Create: `scripts/guardian/guardian-verify-spt.ts`

Queries Guardian for verified MRV data, sums tCO2e, compares against target, and calls `setCoupon()` on the ATS bond contract if a penalty is triggered.

```ts
// scripts/guardian/guardian-verify-spt.ts
// Checks sustainability performance target and adjusts coupon rate
// Uses verified data from Guardian + setCoupon on ATS bond

// 1. Login to Guardian API
// 2. Query Verification Statement VCs for current period
// 3. Sum verifiedGHGReduced across all statements
// 4. Compare against SPT target (10,000 tCO2e)
// 5. If target missed: setCoupon with rate=450, rateDecimals=4 (4.50%)
// 6. If target met: setCoupon with rate=425, rateDecimals=4 (4.25%)
// 7. Log result
```

**Step 1: Implement, Step 2: Run against live Guardian + testnet, Step 3: Commit**

---

## Phase 6: Testing

### Task 19: E2E Tests — Mock Suite

**Files:**
- Create: `e2e/tests/guardian-impact.spec.ts`
- Create: `e2e/tests/guardian-invest.spec.ts`

Mock suite that intercepts Guardian API calls with Playwright route mocking. Tests all the scenarios from the design doc's E2E test section.

**Step 1: Write tests, Step 2: Run with `npx playwright test guardian-*`, Step 3: Commit**

---

### Task 20: E2E Tests — Live Suite

**Files:**
- Create: `e2e/tests/guardian-live.spec.ts`

Tagged with `test.describe.configure({ mode: 'serial' })` and a custom `@live` annotation. Runs against real Guardian instance. Verifies real HCS messages exist, IPFS CIDs resolve, trust chain data matches expected demo data.

**Step 1: Write tests, Step 2: Run manually against live Guardian, Step 3: Commit**

---

## Phase 7: DNS, HTTPS, and Deployment

### Task 21: Configure guardian.coppice.cc Domain

**Steps:**
1. Add DNS A record: `guardian.coppice.cc` → `195.201.8.147`
2. Update HAProxy config on server to terminate TLS for `guardian.coppice.cc` and proxy to localhost:3100
3. Obtain Let's Encrypt cert via certbot
4. Verify: `curl https://guardian.coppice.cc/api/v1/accounts/session`
5. Update `GUARDIAN_API_URL` in frontend `.env` to `https://guardian.coppice.cc`

---

### Task 22: Configure coppice.cc on Vercel

**Steps:**
1. Add `coppice.cc` domain in Vercel project settings
2. Configure DNS records as Vercel instructs (CNAME or A record)
3. Set Vercel environment variable: `GUARDIAN_API_URL=https://guardian.coppice.cc`
4. Deploy and verify

---

### Task 23: Final Verification

**Steps:**
1. Run: `npm run test:unit` — all pass
2. Run: `npm run lint` — clean
3. Run: `npm run build` — clean
4. Run: `cd e2e && npx playwright test guardian-*` — mock suite passes
5. Run: `cd e2e && npx playwright test guardian-live` — live suite passes
6. Manual smoke test: visit coppice.cc, check Impact page shows real Guardian data
7. Run SPT verification script to demonstrate coupon penalty
