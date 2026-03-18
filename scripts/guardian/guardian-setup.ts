// One-time Guardian setup: Standard Registry, schemas, policy, user accounts
// Requires: Guardian running at GUARDIAN_API_URL with operator credentials configured
// Run: cd scripts && npx tsx guardian/guardian-setup.ts

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { Client, AccountCreateTransaction, PrivateKey, Hbar, AccountId } from "@hashgraph/sdk";
import { GuardianClient } from "./api-client.js";
import { ALL_SCHEMAS, SCHEMA_NAMES } from "./schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
// Also load parent scripts/.env for Hedera funding account
dotenv.config({ path: path.join(__dirname, "../.env") });

async function createHederaAccount(funderId: string, funderKey: string): Promise<{ accountId: string; privateKey: string }> {
  const client = Client.forTestnet();
  const keyHex = funderKey.startsWith("0x") ? funderKey.slice(2) : funderKey;
  client.setOperator(AccountId.fromString(funderId), PrivateKey.fromStringECDSA(keyHex));

  const newKey = PrivateKey.generateED25519();
  const tx = await new AccountCreateTransaction()
    .setKey(newKey.publicKey)
    .setInitialBalance(new Hbar(10))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const accountId = receipt.accountId!.toString();
  client.close();

  return { accountId, privateKey: newKey.toStringDer() };
}

const SR_USERNAME = "CoppiceSR";
const SR_PASSWORD = "CoppiceSR2026!";
const ISSUER_USERNAME = "CpcIssuer";
const ISSUER_PASSWORD = "CpcIssuer2026!";
const VVB_USERNAME = "CpcVerifier";
const VVB_PASSWORD = "CpcVerifier2026!";

type SchemaEntry = { id: string; name: string; status: string; uuid: string; iri: string; topicId: string };
type PolicyEntry = { id: string; name: string; status: string; uuid: string; topicId: string };

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
  try {
    await client.register(SR_USERNAME, SR_PASSWORD, "STANDARD_REGISTRY");
    console.log("   Registered successfully");
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("already") || msg.includes("409")) {
      console.log("   Already registered, continuing...");
    } else {
      throw err;
    }
  }

  await client.login(SR_USERNAME, SR_PASSWORD);
  console.log("   Logged in as Standard Registry\n");

  // 2. Configure SR profile with Hedera credentials
  console.log("2. Configuring SR profile with Hedera operator...");
  const existingProfile = await client.get<{ confirmed?: boolean; topicId?: string }>(
    `/api/v1/profiles/${SR_USERNAME}`
  );

  if (existingProfile.confirmed) {
    console.log("   Profile already confirmed, skipping initialization");
  } else {
    console.log("   Setting profile (creates DID + HCS topics on testnet)...");
    await client.putAsync(`/api/v1/profiles/push/${SR_USERNAME}`, {
      hederaAccountId: operatorId,
      hederaAccountKey: operatorKey,
    }, 600_000);

    let confirmed = false;
    for (let i = 0; i < 60; i++) {
      const profile = await client.get<{ confirmed: boolean }>(`/api/v1/profiles/${SR_USERNAME}`);
      if (profile.confirmed) { confirmed = true; break; }
      await new Promise((r) => setTimeout(r, 5000));
      process.stdout.write(".");
    }
    if (!confirmed) throw new Error("Profile initialization timed out");
    console.log("\n   SR profile confirmed");
  }
  console.log("");

  // 3. Create policy first (DRAFT) — schemas go on policy's topicId
  console.log("3. Creating/finding policy: CPC Green Bond MRV...");
  const existingPolicies = await client.get<PolicyEntry[]>("/api/v1/policies");
  // Only consider active policies (not DISCONTINUED)
  let policy = existingPolicies.find(
    (p) => p.name === "CPC Green Bond MRV" && p.status !== "DISCONTINUED"
  );

  let policyId: string;
  let policyTopicId: string;

  if (policy && (policy.status === "PUBLISH" || policy.status === "PUBLISHED")) {
    policyId = policy.id;
    policyTopicId = policy.topicId;
    console.log(`   Found published policy: ${policyId} (topic: ${policyTopicId})\n`);
    // Policy exists — still need to ensure users are set up
    await setupUserAccounts(client, policyId);
    saveEnv(policyId);
    return;
  }

  if (policy) {
    // Reuse existing DRAFT policy
    policyId = policy.id;
    policyTopicId = policy.topicId;
    console.log(`   Found existing DRAFT policy: ${policyId} (topic: ${policyTopicId})`);
  } else {
    // Create a minimal policy to get a topicId — will update config later
    const minimalConfig = buildPolicyConfig({});
    const response = await client.post<PolicyEntry | PolicyEntry[]>("/api/v1/policies", minimalConfig);
    if (Array.isArray(response)) {
      const created = response.find((p) => p.name === "CPC Green Bond MRV");
      if (!created) throw new Error("Policy created but not found in response array");
      policy = created;
    } else {
      policy = response;
    }
    policyId = policy.id;
    policyTopicId = policy.topicId;
    console.log(`   Policy created: ${policyId} (topic: ${policyTopicId})`);
  }
  console.log("");

  // 4. Create schemas on the POLICY's topicId
  console.log("4. Creating/finding schemas...");
  const existingSchemas = await client.get<SchemaEntry[]>("/api/v1/schemas");
  const schemaIds: Record<string, string> = {};

  for (const schema of ALL_SCHEMAS) {
    // Check if schema already exists on this policy's topic
    const existing = existingSchemas.find((s) => s.name === schema.name && s.topicId === policyTopicId);
    if (existing) {
      schemaIds[schema.name] = existing.id;
      console.log(`   Found existing: ${schema.name} -> ${existing.id} (${existing.status})`);
    } else {
      console.log(`   Creating: ${schema.name} on topic ${policyTopicId}...`);
      await client.post<SchemaEntry[]>(
        `/api/v1/schemas/${policyTopicId}`,
        schema
      );
      // Re-fetch to find the newly created schema (POST response may be paginated)
      const refreshed = await client.get<SchemaEntry[]>("/api/v1/schemas");
      const created = refreshed.find((s) => s.name === schema.name && s.topicId === policyTopicId);
      if (created) {
        schemaIds[schema.name] = created.id;
        console.log(`   -> ${created.id}`);
      } else {
        throw new Error(`Schema ${schema.name} created but not found after re-fetch`);
      }
    }
  }
  console.log("");

  // 5. Publish schemas
  console.log("5. Publishing schemas...");
  const freshSchemas = await client.get<SchemaEntry[]>("/api/v1/schemas");
  for (const name of SCHEMA_NAMES) {
    const id = schemaIds[name];
    if (!id) { console.log(`   Skipping ${name} (no ID)`); continue; }
    const current = freshSchemas.find((s) => s.id === id);
    if (current?.status === "PUBLISHED") {
      console.log(`   ${name} already published`);
      continue;
    }
    console.log(`   Publishing: ${name}...`);
    await client.putAsync(`/api/v1/schemas/push/${id}/publish`, { version: "1.0.0" });
    console.log(`   -> Published`);
  }
  console.log("");

  // 6. Collect schema IRIs and update policy config
  console.log("6. Updating policy config with schema references...");
  const publishedSchemas = await client.get<SchemaEntry[]>("/api/v1/schemas");
  const schemaIris: Record<string, string> = {};
  for (const name of SCHEMA_NAMES) {
    const s = publishedSchemas.find((x) => x.name === name && x.topicId === policyTopicId);
    if (s?.iri) {
      schemaIris[name] = s.iri;
      console.log(`   ${name}: ${s.iri}`);
    }
  }

  // Update the policy with proper schema IRI references
  const updatedConfig = buildPolicyConfig(schemaIris);
  await client.put(`/api/v1/policies/${policyId}`, {
    ...updatedConfig,
    id: policyId,
  });
  console.log("   Policy config updated\n");

  // 7. Publish policy
  console.log("7. Publishing policy to Hedera testnet (this may take 15-30 min)...");
  try {
    await client.putAsync(
      `/api/v1/policies/push/${policyId}/publish`,
      { policyVersion: "1.0.0" },
      1_800_000 // 30 min
    );
    console.log("   Policy published\n");
  } catch (err) {
    console.error(`   Policy publish failed: ${(err as Error).message}`);
    // Check if it published despite the error (timeout case)
    const checkPolicy = await client.get<{ status: string }>(`/api/v1/policies/${policyId}`);
    if (checkPolicy.status === "PUBLISH" || checkPolicy.status === "PUBLISHED") {
      console.log("   Policy is actually published (task may have timed out)\n");
    } else {
      console.log(`   Policy status: ${checkPolicy.status} — may need manual publish\n`);
    }
  }

  // Verify policy engine is healthy by testing the blocks endpoint
  console.log("   Verifying policy engine health...");
  let engineHealthy = false;
  for (let i = 0; i < 10; i++) {
    try {
      await client.get(`/api/v1/policies/${policyId}/blocks`);
      engineHealthy = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 10_000));
      process.stdout.write(".");
    }
  }
  if (engineHealthy) {
    console.log("\n   Policy engine responding\n");
  } else {
    console.log("\n   WARNING: Policy engine not responding — blocks endpoint timed out\n");
  }

  // 8. Register user accounts, configure profiles, assign policy
  await setupUserAccounts(client, policyId);

  saveEnv(policyId);

  function saveEnv(pid: string) {
    const envPath = path.join(__dirname, ".env");
    let envContent = fs.readFileSync(envPath, "utf-8");
    envContent = envContent.replace(/GUARDIAN_POLICY_ID=.*/, `GUARDIAN_POLICY_ID="${pid}"`);
    envContent = envContent.replace(/GUARDIAN_SR_USERNAME=.*/, `GUARDIAN_SR_USERNAME="${SR_USERNAME}"`);
    envContent = envContent.replace(/GUARDIAN_SR_PASSWORD=.*/, `GUARDIAN_SR_PASSWORD="${SR_PASSWORD}"`);
    envContent = envContent.replace(/GUARDIAN_ISSUER_USERNAME=.*/, `GUARDIAN_ISSUER_USERNAME="${ISSUER_USERNAME}"`);
    envContent = envContent.replace(/GUARDIAN_ISSUER_PASSWORD=.*/, `GUARDIAN_ISSUER_PASSWORD="${ISSUER_PASSWORD}"`);
    envContent = envContent.replace(/GUARDIAN_VVB_USERNAME=.*/, `GUARDIAN_VVB_USERNAME="${VVB_USERNAME}"`);
    envContent = envContent.replace(/GUARDIAN_VVB_PASSWORD=.*/, `GUARDIAN_VVB_PASSWORD="${VVB_PASSWORD}"`);
    fs.writeFileSync(envPath, envContent);

    console.log("=== Setup Complete ===");
    console.log(`Policy ID: ${pid}`);
    console.log("Credentials saved to scripts/guardian/.env");
  }
}

async function setupUserAccounts(srClient: GuardianClient, policyId: string) {
  const funderId = process.env.HEDERA_ACCOUNT_ID;
  const funderKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!funderId || !funderKey) {
    throw new Error("Missing HEDERA_ACCOUNT_ID or DEPLOYER_PRIVATE_KEY in scripts/.env (needed to fund user accounts)");
  }

  // Get the SR's DID — needed so users are linked to this SR
  const srProfile = await srClient.get<{ did: string }>(`/api/v1/profiles/${SR_USERNAME}`);
  const srDid = srProfile.did;
  if (!srDid) throw new Error("SR profile has no DID — profile not confirmed?");
  console.log(`   SR DID: ${srDid}\n`);

  const users = [
    { username: ISSUER_USERNAME, password: ISSUER_PASSWORD },
    { username: VVB_USERNAME, password: VVB_PASSWORD },
  ];

  console.log("8. Registering and configuring user accounts...\n");

  for (const { username, password } of users) {
    // 8a. Register
    try {
      await srClient.register(username, password, "USER");
      console.log(`   Registered: ${username}`);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("already") || msg.includes("409")) {
        console.log(`   ${username} already registered`);
      } else {
        throw err;
      }
    }

    // 8b. Check if profile already confirmed
    const userClient = new GuardianClient();
    await userClient.login(username, password);

    const profile = await userClient.get<{ confirmed?: boolean; did?: string }>(
      `/api/v1/profiles/${username}`
    );

    if (profile.confirmed) {
      console.log(`   ${username} profile already confirmed (DID: ${profile.did})`);
    } else {
      // Create a new Hedera testnet account for this user
      console.log(`   Creating Hedera account for ${username}...`);
      const { accountId, privateKey } = await createHederaAccount(funderId, funderKey);
      console.log(`   -> ${accountId}`);

      // Configure profile with parent SR linkage (entity + parent fields are critical)
      console.log(`   Configuring profile for ${username} (linked to SR)...`);
      try {
        await userClient.putAsync(`/api/v1/profiles/push/${username}`, {
          entity: "USER",
          hederaAccountId: accountId,
          hederaAccountKey: privateKey,
          parent: srDid,
        }, 600_000);
      } catch (err) {
        // "Invalid DID" task error is benign — profile still gets confirmed
        const msg = (err as Error).message;
        if (msg.includes("Invalid DID")) {
          console.log(`   (benign task error: Invalid DID — profile may still confirm)`);
        } else {
          throw err;
        }
      }

      // Poll until confirmed
      let confirmed = false;
      for (let i = 0; i < 60; i++) {
        const p = await userClient.get<{ confirmed: boolean }>(`/api/v1/profiles/${username}`);
        if (p.confirmed) { confirmed = true; break; }
        await new Promise((r) => setTimeout(r, 5000));
        process.stdout.write(".");
      }
      if (!confirmed) throw new Error(`${username} profile initialization timed out`);
      console.log(`\n   ${username} profile confirmed`);
    }
  }
  console.log("");

  // 9. Assign policy to users (as SR)
  console.log("9. Assigning policy to user accounts...");
  for (const { username } of users) {
    try {
      await srClient.post(`/api/v1/permissions/users/${username}/policies/assign`, {
        policyIds: [policyId],
        assign: true,
      });
      console.log(`   Assigned policy to ${username}`);
    } catch (err) {
      console.log(`   Policy assignment for ${username}: ${(err as Error).message.slice(0, 200)}`);
    }
  }
  console.log("");
}

function buildPolicyConfig(schemaIris: Record<string, string>) {
  let tagCounter = 0;
  const tag = (prefix: string) => `${prefix}_${++tagCounter}`;

  // Creates a request→save→view block group following Guardian patterns:
  // - requestVcDocumentBlock (defaultActive: true) fires RunEvent to sendToGuardianBlock
  // - sendToGuardianBlock (defaultActive: false) saves VC, fires RefreshEvent to viewer
  // - interfaceDocumentsSourceBlock requires documentsSourceAddon child for data queries
  function vcBlockGroup(schemaName: string, reqPrefix: string, sendPrefix: string, viewPrefix: string) {
    const reqTag = tag(reqPrefix);
    const sendTag = tag(sendPrefix);
    const viewTag = tag(viewPrefix);
    const addonTag = tag(`addon_${viewPrefix}`);

    const requestBlock = {
      id: randomUUID(),
      blockType: "requestVcDocumentBlock",
      tag: reqTag,
      defaultActive: true,
      permissions: ["ANY_ROLE"],
      schema: schemaIris[schemaName] || "",
      idType: "UUID",
      uiMetaData: {
        type: "page",
        title: schemaName.replace(/([A-Z])/g, " $1").trim(),
      },
      events: [],
    };

    const saveBlock = {
      id: randomUUID(),
      blockType: "sendToGuardianBlock",
      tag: sendTag,
      defaultActive: false,
      dataSource: "auto",
      documentType: "vc",
      entityType: schemaName.toLowerCase(),
      stopPropagation: false,
      options: [
        { name: "status", value: "Submitted" },
      ],
      events: [
        {
          source: sendTag,
          target: viewTag,
          output: "RefreshEvent",
          input: "RefreshEvent",
          actor: "",
          disabled: false,
        },
      ],
    };

    const viewerBlock = {
      id: randomUUID(),
      blockType: "interfaceDocumentsSourceBlock",
      tag: viewTag,
      defaultActive: true,
      permissions: ["ANY_ROLE"],
      onlyOwnDocuments: true,
      uiMetaData: {
        fields: [
          { title: "Created", name: "createDate", type: "text" },
          { title: "Status", name: "option.status", type: "text" },
        ],
        enableSorting: false,
      },
      children: [
        {
          id: randomUUID(),
          blockType: "documentsSourceAddon",
          tag: addonTag,
          defaultActive: false,
          filters: [],
          dataType: "vc-documents",
          schema: schemaIris[schemaName] || "",
          onlyOwnDocuments: true,
        },
      ],
    };

    return [requestBlock, saveBlock, viewerBlock];
  }

  return {
    name: "CPC Green Bond MRV",
    description:
      "ICMA-aligned green bond MRV verification policy for Coppice. Verifies fund allocation, environmental impact, and sustainability performance targets.",
    topicDescription: "CPC Green Bond MRV Policy",
    policyTag: `cpc_mrv_${Date.now()}`,
    policyRoles: ["Bond Issuer", "Verifier"],
    policyGroups: [],
    config: {
      id: randomUUID(),
      blockType: "interfaceContainerBlock",
      tag: "root",
      defaultActive: true,
      permissions: ["ANY_ROLE"],
      children: [
        {
          id: randomUUID(),
          blockType: "policyRolesBlock",
          tag: tag("roles"),
          defaultActive: true,
          permissions: ["NO_ROLE"],
          uiMetaData: { title: "Select Role" },
        },
        {
          id: randomUUID(),
          blockType: "interfaceContainerBlock",
          tag: tag("issuer_container"),
          defaultActive: true,
          permissions: ["Bond Issuer"],
          children: [
            {
              id: randomUUID(),
              blockType: "interfaceContainerBlock",
              tag: tag("bond_framework_tab"),
              defaultActive: true,
              permissions: ["Bond Issuer"],
              uiMetaData: { type: "tabs", title: "Bond Framework" },
              children: vcBlockGroup("BondFramework", "req_bond_framework", "send_bond_framework", "view_bond_frameworks"),
            },
            {
              id: randomUUID(),
              blockType: "interfaceContainerBlock",
              tag: tag("project_tab"),
              defaultActive: true,
              permissions: ["Bond Issuer"],
              uiMetaData: { type: "tabs", title: "Projects" },
              children: vcBlockGroup("ProjectRegistration", "req_project", "send_project", "view_projects"),
            },
            {
              id: randomUUID(),
              blockType: "interfaceContainerBlock",
              tag: tag("allocation_tab"),
              defaultActive: true,
              permissions: ["Bond Issuer"],
              uiMetaData: { type: "tabs", title: "Fund Allocations" },
              children: vcBlockGroup("FundAllocation", "req_allocation", "send_allocation", "view_allocations"),
            },
            {
              id: randomUUID(),
              blockType: "interfaceContainerBlock",
              tag: tag("mrv_tab"),
              defaultActive: true,
              permissions: ["Bond Issuer"],
              uiMetaData: { type: "tabs", title: "MRV Reports" },
              children: vcBlockGroup("MRVMonitoringReport", "req_mrv", "send_mrv", "view_mrvs"),
            },
          ],
        },
        {
          id: randomUUID(),
          blockType: "interfaceContainerBlock",
          tag: tag("verifier_container"),
          defaultActive: true,
          permissions: ["Verifier"],
          children: [
            {
              id: randomUUID(),
              blockType: "interfaceContainerBlock",
              tag: tag("review_tab"),
              defaultActive: true,
              permissions: ["Verifier"],
              uiMetaData: { type: "tabs", title: "Review MRV Reports" },
              children: [
                {
                  id: randomUUID(),
                  blockType: "interfaceDocumentsSourceBlock",
                  tag: tag("review_mrvs"),
                  defaultActive: true,
                  permissions: ["ANY_ROLE"],
                  onlyOwnDocuments: false,
                  uiMetaData: {
                    fields: [
                      { title: "Created", name: "createDate", type: "text" },
                      { title: "Status", name: "option.status", type: "text" },
                    ],
                    enableSorting: false,
                  },
                  children: [
                    {
                      id: randomUUID(),
                      blockType: "documentsSourceAddon",
                      tag: tag("addon_review_mrvs"),
                      defaultActive: false,
                      filters: [],
                      dataType: "vc-documents",
                      schema: schemaIris["MRVMonitoringReport"] || "",
                      onlyOwnDocuments: false,
                    },
                  ],
                },
              ],
            },
            {
              id: randomUUID(),
              blockType: "interfaceContainerBlock",
              tag: tag("verification_tab"),
              defaultActive: true,
              permissions: ["Verifier"],
              uiMetaData: { type: "tabs", title: "Verification Statements" },
              children: vcBlockGroup("VerificationStatement", "req_verification", "send_verification", "view_verifications"),
            },
          ],
        },
      ],
    },
  };
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
