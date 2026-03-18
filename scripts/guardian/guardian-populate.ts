// Populates the Guardian policy with demo data
// Run after guardian-setup.ts has created the policy
// cd scripts && npx tsx guardian/guardian-populate.ts

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { GuardianClient } from "./api-client.js";
import {
  BOND_FRAMEWORK,
  PROJECTS,
  ALLOCATIONS,
  MRV_REPORTS,
  VERIFICATION_STATEMENTS,
} from "./demo-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// Tag names from buildPolicyConfig in guardian-setup.ts (counter-based)
// Each vcBlockGroup now generates 4 tags (req, send, view, addon) instead of 3
const TAGS = {
  roles: "roles_1",
  reqBondFramework: "req_bond_framework_4",
  reqProject: "req_project_9",
  reqAllocation: "req_allocation_14",
  reqMrv: "req_mrv_19",
  reqVerification: "req_verification_28",
};

const SR_USERNAME = process.env.GUARDIAN_SR_USERNAME || "CoppiceSR";
const SR_PASSWORD = process.env.GUARDIAN_SR_PASSWORD || "CoppiceSR2026!";
const ISSUER_USERNAME = process.env.GUARDIAN_ISSUER_USERNAME || "CpcIssuer";
const ISSUER_PASSWORD = process.env.GUARDIAN_ISSUER_PASSWORD || "CpcIssuer2026!";
const VVB_USERNAME = process.env.GUARDIAN_VVB_USERNAME || "CpcVerifier";
const VVB_PASSWORD = process.env.GUARDIAN_VVB_PASSWORD || "CpcVerifier2026!";

async function postToTag(client: GuardianClient, policyId: string, tag: string, body: unknown, label: string) {
  try {
    await client.post(`/api/v1/policies/${policyId}/tag/${tag}/blocks`, body);
    console.log(`  -> ${label}: submitted`);
  } catch (err) {
    console.log(`  -> ${label}: ${(err as Error).message.slice(0, 500)}`);
  }
}

async function main() {
  const policyId = process.env.GUARDIAN_POLICY_ID;
  if (!policyId) throw new Error("GUARDIAN_POLICY_ID not set. Run guardian-setup.ts first.");

  console.log("=== Populating Guardian Demo Data ===\n");
  console.log(`Policy ID: ${policyId}\n`);

  // --- Phase 1: Bond Issuer role + VCs ---
  console.log("Phase 1: Bond Issuer data...\n");
  const issuerClient = new GuardianClient();
  await issuerClient.login(ISSUER_USERNAME, ISSUER_PASSWORD);

  // Assign Bond Issuer role
  console.log("  Assigning Bond Issuer role...");
  await postToTag(issuerClient, policyId, TAGS.roles, { role: "Bond Issuer" }, "Role");
  await sleep(5000);

  // Submit Bond Framework
  console.log("  Submitting Bond Framework...");
  await postToTag(issuerClient, policyId, TAGS.reqBondFramework, { document: BOND_FRAMEWORK, ref: null }, "BondFramework");
  await sleep(3000);

  // Submit Projects
  for (const project of PROJECTS) {
    console.log(`  Submitting Project: ${project.ProjectName}...`);
    await postToTag(issuerClient, policyId, TAGS.reqProject, { document: project, ref: null }, project.ProjectName);
    await sleep(3000);
  }

  // Submit Allocations
  for (const allocation of ALLOCATIONS) {
    console.log(`  Submitting Allocation: ${allocation.ProjectName}...`);
    await postToTag(issuerClient, policyId, TAGS.reqAllocation, { document: allocation, ref: null }, allocation.ProjectName);
    await sleep(3000);
  }

  // Submit MRV Reports
  for (const report of MRV_REPORTS) {
    console.log(`  Submitting MRV: ${report.ProjectName}...`);
    await postToTag(issuerClient, policyId, TAGS.reqMrv, { document: report, ref: null }, report.ProjectName);
    await sleep(3000);
  }

  console.log("");

  // --- Phase 2: Verifier role + Verification Statements ---
  console.log("Phase 2: Verifier data...\n");
  const vvbClient = new GuardianClient();
  await vvbClient.login(VVB_USERNAME, VVB_PASSWORD);

  // Assign Verifier role
  console.log("  Assigning Verifier role...");
  await postToTag(vvbClient, policyId, TAGS.roles, { role: "Verifier" }, "Role");
  await sleep(5000);

  // Submit Verification Statements
  for (const statement of VERIFICATION_STATEMENTS) {
    console.log(`  Submitting Verification: ${statement.ProjectName}...`);
    await postToTag(vvbClient, policyId, TAGS.reqVerification, { document: statement, ref: null }, statement.ProjectName);
    await sleep(3000);
  }

  console.log("");

  // --- Phase 3: Verify via viewer blocks ---
  console.log("Phase 3: Verifying stored VCs via viewer blocks...\n");
  const srClient = new GuardianClient();
  await srClient.login(SR_USERNAME, SR_PASSWORD);

  // Re-login as issuer to access Bond Issuer blocks
  const verifyClient = new GuardianClient();
  await verifyClient.login(ISSUER_USERNAME, ISSUER_PASSWORD);

  const viewerTags = [
    { tag: "view_bond_frameworks_6", name: "Bond Frameworks" },
    { tag: "view_projects_11", name: "Projects" },
    { tag: "view_allocations_16", name: "Allocations" },
    { tag: "view_mrvs_21", name: "MRV Reports" },
  ];

  for (const { tag, name } of viewerTags) {
    try {
      const data = await verifyClient.get<{ data?: unknown[] }>(`/api/v1/policies/${policyId}/tag/${tag}/blocks`);
      const count = Array.isArray(data?.data) ? data.data.length : "N/A";
      console.log(`  ${name}: ${count} documents`);
    } catch (err) {
      console.log(`  ${name}: ${(err as Error).message.slice(0, 150)}`);
    }
  }

  console.log("\n=== Population Complete ===");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Population failed:", err.message);
  process.exit(1);
});
