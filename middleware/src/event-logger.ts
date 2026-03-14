/**
 * Listens for ERC-3643 Token contract events and logs them to HCS audit topic.
 * Uses polling (eth_getLogs) instead of filters since Hedera JSON-RPC
 * doesn't support eth_newFilter in batch requests.
 *
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

const TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner)",
];

const POLL_INTERVAL_MS = 5000; // 5 seconds

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
  const iface = new ethers.Interface(TOKEN_ABI);

  console.log(`Event Logger started`);
  console.log(`  Token: ${tokenAddress}`);
  console.log(`  Audit Topic: ${auditTopicIdStr}`);
  console.log(`  Poll interval: ${POLL_INTERVAL_MS}ms`);

  // Start from current block
  let lastBlock = await provider.getBlockNumber();
  console.log(`  Starting from block: ${lastBlock}`);
  console.log(`  Listening for events...\n`);

  const seenTxs = new Set<string>();

  async function poll() {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock <= lastBlock) return;

      const logs = await provider.getLogs({
        address: tokenAddress,
        fromBlock: lastBlock + 1,
        toBlock: currentBlock,
      });

      for (const log of logs) {
        // Deduplicate by tx hash + log index
        const logKey = `${log.transactionHash}-${log.index}`;
        if (seenTxs.has(logKey)) continue;
        seenTxs.add(logKey);

        let payload: AuditEvent | null = null;

        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (!parsed) continue;

          switch (parsed.name) {
            case "Transfer": {
              const from = parsed.args[0] as string;
              const to = parsed.args[1] as string;
              const value = parsed.args[2] as bigint;
              payload = {
                type: from === ethers.ZeroAddress ? "MINT" : "TRANSFER",
                ts: Date.now(),
                tx: log.transactionHash,
                data: {
                  from: abbreviateAddress(from),
                  to: abbreviateAddress(to),
                  amount: ethers.formatEther(value),
                },
              };
              break;
            }
            case "Paused": {
              payload = {
                type: "TOKEN_PAUSED",
                ts: Date.now(),
                tx: log.transactionHash,
                data: { by: abbreviateAddress(parsed.args[0] as string) },
              };
              break;
            }
            case "Unpaused": {
              payload = {
                type: "TOKEN_UNPAUSED",
                ts: Date.now(),
                tx: log.transactionHash,
                data: { by: abbreviateAddress(parsed.args[0] as string) },
              };
              break;
            }
            case "AddressFrozen": {
              const addr = parsed.args[0] as string;
              const isFrozen = parsed.args[1] as boolean;
              const owner = parsed.args[2] as string;
              payload = {
                type: isFrozen ? "WALLET_FROZEN" : "WALLET_UNFROZEN",
                ts: Date.now(),
                tx: log.transactionHash,
                data: {
                  wallet: abbreviateAddress(addr),
                  by: abbreviateAddress(owner),
                },
              };
              break;
            }
          }
        } catch {
          // Unknown event — skip
          continue;
        }

        if (payload) {
          console.log(`  ${payload.type}: ${JSON.stringify(payload.data)}`);
          try {
            await submitToHCS(client, auditTopicId, operatorKey, payload);
            console.log(`    -> HCS submitted`);
          } catch (err: any) {
            console.error(`    -> HCS error: ${err.message?.slice(0, 100)}`);
          }
        }
      }

      lastBlock = currentBlock;
    } catch (err: any) {
      console.error(`  Poll error: ${err.message?.slice(0, 100)}`);
    }
  }

  // Poll loop
  setInterval(poll, POLL_INTERVAL_MS);

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
