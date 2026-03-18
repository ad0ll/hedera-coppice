// Validates the current policy config to check for errors before publishing
// cd scripts && npx tsx guardian/validate-policy.ts
import { GuardianClient } from "./api-client.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

async function main() {
  const client = new GuardianClient();
  const username = process.env.GUARDIAN_SR_USERNAME || "CoppiceSR";
  const password = process.env.GUARDIAN_SR_PASSWORD || "CoppiceSR2026!";
  await client.login(username, password);

  const policyId = process.env.GUARDIAN_POLICY_ID;
  if (!policyId) throw new Error("GUARDIAN_POLICY_ID not set");

  // Get current policy config
  const policy = await client.get<Record<string, unknown>>(`/api/v1/policies/${policyId}`);
  console.log(`Policy: ${policy.name} (${policy.status})`);
  console.log(`TopicId: ${policy.topicId}`);

  // Validate
  console.log("\nValidating...");
  const result = await client.post<{
    policy: Record<string, unknown>;
    results: {
      errors: string[] | null;
      warnings: string[];
      infos: string[];
      blocks: Array<{ id: string; name: string; errors: string[]; warnings: string[]; isValid: boolean }> | null;
    };
  }>("/api/v1/policies/validate", policy);

  const r = result.results;
  if (r.errors && r.errors.length > 0) {
    console.log("\nPolicy-level errors:");
    for (const e of r.errors) console.log(`  ERROR: ${e}`);
  }
  if (r.warnings && r.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of r.warnings) console.log(`  WARN: ${w}`);
  }
  if (r.blocks) {
    const invalidBlocks = r.blocks.filter(b => !b.isValid);
    if (invalidBlocks.length > 0) {
      console.log(`\n${invalidBlocks.length} invalid blocks:`);
      for (const b of invalidBlocks) {
        console.log(`  Block ${b.name || b.id}:`);
        for (const e of b.errors) console.log(`    ERROR: ${e}`);
      }
    } else {
      console.log(`\nAll ${r.blocks.length} blocks valid!`);
    }
  }

  const isValid = (!r.errors || r.errors.length === 0) &&
    (!r.blocks || r.blocks.every(b => b.isValid));
  console.log(`\nOverall: ${isValid ? "VALID" : "INVALID"}`);
}

main().catch((err) => {
  console.error("Validation failed:", err.message);
  process.exit(1);
});
