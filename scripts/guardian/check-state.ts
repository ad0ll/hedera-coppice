// Temporary: check current Guardian state
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

  const policies = await client.get<Array<Record<string, unknown>>>("/api/v1/policies");
  console.log(`=== ${policies.length} policies ===`);
  for (const p of policies) {
    console.log(`  ${p.name} | id=${p.id} | status=${p.status} | topicId=${p.topicId}`);
  }

  const schemas = await client.get<Array<Record<string, unknown>>>("/api/v1/schemas");
  console.log(`\n=== ${schemas.length} schemas ===`);
  for (const s of schemas) {
    console.log(`  ${s.name} | id=${s.id} | status=${s.status} | topicId=${s.topicId} | iri=${s.iri}`);
  }

  const profile = await client.get<Record<string, unknown>>(`/api/v1/profiles/${username}`);
  console.log(`\n=== SR Profile ===`);
  console.log(`  confirmed=${profile.confirmed} topicId=${profile.topicId} hederaAccountId=${profile.hederaAccountId}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
