// Tears down existing Guardian policies and schemas for a clean re-run
// Published policies can't be deleted — must discontinue first
// cd scripts && npx tsx guardian/teardown.ts
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

  // Discontinue/delete all policies
  console.log("=== Cleaning up policies ===");
  const policies = await client.get<Array<{ id: string; name: string; status: string }>>("/api/v1/policies");
  for (const p of policies) {
    if (p.status === "DISCONTINUED") {
      console.log(`  Skipping already discontinued: ${p.name} (${p.id})`);
      continue;
    }
    if (p.status === "PUBLISH" || p.status === "PUBLISHED") {
      console.log(`  Discontinuing published policy: ${p.name} (${p.id})...`);
      try {
        await client.put(`/api/v1/policies/${p.id}/discontinue`, {});
        console.log("  -> Discontinued");
      } catch (err) {
        console.log(`  -> Failed: ${(err as Error).message.slice(0, 200)}`);
      }
    } else {
      console.log(`  Deleting draft policy: ${p.name} (${p.id})...`);
      try {
        await client.deleteAsync(`/api/v1/policies/push/${p.id}`);
        console.log("  -> Deleted");
      } catch (err) {
        console.log(`  -> Failed: ${(err as Error).message.slice(0, 200)}`);
      }
    }
  }

  console.log("\n=== Teardown complete ===");
  console.log("Run: cd scripts && npx tsx guardian/guardian-setup.ts");
}

main().catch((err) => {
  console.error("Teardown failed:", err.message);
  process.exit(1);
});
