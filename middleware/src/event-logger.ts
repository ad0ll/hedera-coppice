/**
 * Listens for ERC-3643 Token contract events and logs them to HCS audit topic.
 * Events: Transfer, Paused, Unpaused, AddressFrozen
 */
import { TopicMessageSubmitTransaction, TopicId } from "@hashgraph/sdk";
import { ethers } from "ethers";
import { getClient, getOperatorKey, JSON_RPC_URL } from "./config.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Minimal ABI for the events we care about
const TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner)",
];

interface AuditEvent {
  type: string;
  ts: number;
  tx: string;
  data: Record<string, string>;
}

function abbreviateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function submitToHCS(
  client: any,
  topicId: TopicId,
  submitKey: any,
  payload: AuditEvent
): Promise<void> {
  const message = JSON.stringify(payload);

  // HCS max message size is 1024 bytes
  if (Buffer.byteLength(message) > 1024) {
    console.warn("  Warning: message exceeds 1KB, truncating data");
  }

  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .freezeWith(client)
    .sign(submitKey);

  await tx.execute(client);
}

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const auditTopicIdStr = process.env.AUDIT_TOPIC_ID;

  if (!tokenAddress || !auditTopicIdStr) {
    throw new Error("Missing TOKEN_ADDRESS or AUDIT_TOPIC_ID in .env");
  }

  const client = getClient();
  const operatorKey = getOperatorKey();
  const auditTopicId = TopicId.fromString(auditTopicIdStr);

  const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);

  console.log(`Event Logger started`);
  console.log(`  Token: ${tokenAddress}`);
  console.log(`  Audit Topic: ${auditTopicIdStr}`);
  console.log(`  Listening for events...\n`);

  // Transfer events
  token.on("Transfer", async (from: string, to: string, value: bigint, event: any) => {
    const payload: AuditEvent = {
      type: from === ethers.ZeroAddress ? "MINT" : "TRANSFER",
      ts: Date.now(),
      tx: event.log.transactionHash,
      data: {
        from: abbreviateAddress(from),
        to: abbreviateAddress(to),
        amount: ethers.formatEther(value),
      },
    };
    console.log(`  ${payload.type}: ${payload.data.from} -> ${payload.data.to} (${payload.data.amount} CPC)`);
    try {
      await submitToHCS(client, auditTopicId, operatorKey, payload);
      console.log(`    -> HCS submitted`);
    } catch (err: any) {
      console.error(`    -> HCS error: ${err.message?.slice(0, 100)}`);
    }
  });

  // Paused event
  token.on("Paused", async (account: string, event: any) => {
    const payload: AuditEvent = {
      type: "TOKEN_PAUSED",
      ts: Date.now(),
      tx: event.log.transactionHash,
      data: { by: abbreviateAddress(account) },
    };
    console.log(`  TOKEN_PAUSED by ${payload.data.by}`);
    try {
      await submitToHCS(client, auditTopicId, operatorKey, payload);
      console.log(`    -> HCS submitted`);
    } catch (err: any) {
      console.error(`    -> HCS error: ${err.message?.slice(0, 100)}`);
    }
  });

  // Unpaused event
  token.on("Unpaused", async (account: string, event: any) => {
    const payload: AuditEvent = {
      type: "TOKEN_UNPAUSED",
      ts: Date.now(),
      tx: event.log.transactionHash,
      data: { by: abbreviateAddress(account) },
    };
    console.log(`  TOKEN_UNPAUSED by ${payload.data.by}`);
    try {
      await submitToHCS(client, auditTopicId, operatorKey, payload);
      console.log(`    -> HCS submitted`);
    } catch (err: any) {
      console.error(`    -> HCS error: ${err.message?.slice(0, 100)}`);
    }
  });

  // AddressFrozen event
  token.on("AddressFrozen", async (addr: string, isFrozen: boolean, owner: string, event: any) => {
    const payload: AuditEvent = {
      type: isFrozen ? "WALLET_FROZEN" : "WALLET_UNFROZEN",
      ts: Date.now(),
      tx: event.log.transactionHash,
      data: {
        wallet: abbreviateAddress(addr),
        by: abbreviateAddress(owner),
      },
    };
    console.log(`  ${payload.type}: ${payload.data.wallet} by ${payload.data.by}`);
    try {
      await submitToHCS(client, auditTopicId, operatorKey, payload);
      console.log(`    -> HCS submitted`);
    } catch (err: any) {
      console.error(`    -> HCS error: ${err.message?.slice(0, 100)}`);
    }
  });

  // Keep alive
  process.on("SIGINT", () => {
    console.log("\nShutting down event logger...");
    client.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
