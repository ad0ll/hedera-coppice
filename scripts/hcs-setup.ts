/**
 * Creates two HCS topics for the Coppice platform:
 * 1. Compliance Audit Trail - logs all token events
 * 2. Green Bond Impact Tracking - logs use-of-proceeds allocations
 */
import { TopicCreateTransaction } from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "./config.js";

async function main() {
  const client = getClient();
  const operatorKey = getOperatorKey();

  console.log("Creating HCS topics on Hedera testnet...\n");

  // Topic 1: Compliance Audit Trail
  console.log("Creating Compliance Audit Trail topic...");
  const auditTx = await new TopicCreateTransaction()
    .setSubmitKey(operatorKey)
    .setTopicMemo("Coppice Compliance Audit Trail")
    .execute(client);
  const auditReceipt = await auditTx.getReceipt(client);
  const auditTopicId = auditReceipt.topicId!;
  console.log(`  Audit Topic ID: ${auditTopicId.toString()}`);

  // Topic 2: Green Bond Impact Tracking
  console.log("Creating Green Bond Impact Tracking topic...");
  const impactTx = await new TopicCreateTransaction()
    .setSubmitKey(operatorKey)
    .setTopicMemo("Coppice Green Bond Impact Tracking")
    .execute(client);
  const impactReceipt = await impactTx.getReceipt(client);
  const impactTopicId = impactReceipt.topicId!;
  console.log(`  Impact Topic ID: ${impactTopicId.toString()}`);

  console.log("\nAdd to .env:");
  console.log(`AUDIT_TOPIC_ID=${auditTopicId.toString()}`);
  console.log(`IMPACT_TOPIC_ID=${impactTopicId.toString()}`);

  client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
