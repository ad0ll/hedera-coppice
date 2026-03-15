/**
 * Listens for ERC-3643 Token contract events and logs them to HCS audit topic.
 * Uses polling (eth_getLogs) instead of filters since Hedera JSON-RPC
 * doesn't support eth_newFilter in batch requests.
 *
 * Events: Transfer, Paused, Unpaused, AddressFrozen
 */
import {
  TopicMessageSubmitTransaction,
  TopicId,
  Client,
  PrivateKey,
} from "@hashgraph/sdk";
import {
  createPublicClient,
  http,
  parseAbi,
  decodeEventLog,
  formatEther,
  zeroAddress,
} from "viem";
import { hederaTestnet } from "viem/chains";
import { getClient, getOperatorKey, JSON_RPC_URL } from "./config.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const TOKEN_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner)",
]);

const POLL_INTERVAL_MS = 5000; // 5 seconds

interface AuditEvent {
  type: string;
  ts: number;
  tx: string;
  data: Record<string, string>;
}

async function submitToHCS(
  client: Client,
  topicId: TopicId,
  submitKey: PrivateKey,
  payload: AuditEvent
): Promise<void> {
  const message = JSON.stringify(payload);

  if (Buffer.byteLength(message) > 1024) {
    console.warn("  Warning: message exceeds 1KB, skipping HCS submission");
    return;
  }

  const delays = [500, 1000, 2000];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const tx = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message)
        .freezeWith(client)
        .sign(submitKey);

      await tx.execute(client);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown";
      if (attempt < 2) {
        console.warn(`  HCS submit attempt ${attempt + 1} failed: ${msg.slice(0, 80)}, retrying...`);
        await new Promise((r) => setTimeout(r, delays[attempt]));
      } else {
        throw err;
      }
    }
  }
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

  const publicClient = createPublicClient({
    chain: hederaTestnet,
    transport: http(JSON_RPC_URL),
  });

  console.log(`Event Logger started`);
  console.log(`  Token: ${tokenAddress}`);
  console.log(`  Audit Topic: ${auditTopicIdStr}`);
  console.log(`  Poll interval: ${POLL_INTERVAL_MS}ms`);

  // Start from current block
  let lastBlock = await publicClient.getBlockNumber();
  console.log(`  Starting from block: ${lastBlock}`);
  console.log(`  Listening for events...\n`);

  const seenTxs = new Map<string, number>(); // logKey -> blockNumber for pruning
  const MAX_SEEN_ENTRIES = 10_000;

  // Narrow tokenAddress to `0x${string}` once for viem's strict hex typing
  const tokenAddr = tokenAddress as `0x${string}`; // viem requires branded hex type for addresses

  async function poll() {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastBlock) return;

      const logs = await publicClient.getLogs({
        address: tokenAddr,
        fromBlock: lastBlock + 1n,
        toBlock: currentBlock,
      });

      for (const log of logs) {
        // Deduplicate by tx hash + log index
        const logKey = `${log.transactionHash}-${log.logIndex}`;
        if (seenTxs.has(logKey)) continue;
        seenTxs.set(logKey, Number(currentBlock));

        // Prune old entries when map grows too large
        if (seenTxs.size > MAX_SEEN_ENTRIES) {
          const cutoff = Number(currentBlock) - 1000;
          for (const [key, block] of seenTxs) {
            if (block < cutoff) seenTxs.delete(key);
          }
        }

        let payload: AuditEvent | null = null;

        try {
          const decoded = decodeEventLog({
            abi: TOKEN_ABI,
            data: log.data,
            topics: log.topics,
          });

          switch (decoded.eventName) {
            case "Transfer": {
              const { from, to, value } = decoded.args;
              payload = {
                type: from === zeroAddress ? "MINT" : "TRANSFER",
                ts: Date.now(),
                tx: log.transactionHash,
                data: {
                  from,
                  to,
                  amount: formatEther(value),
                },
              };
              break;
            }
            case "Paused": {
              payload = {
                type: "TOKEN_PAUSED",
                ts: Date.now(),
                tx: log.transactionHash,
                data: { by: decoded.args.account },
              };
              break;
            }
            case "Unpaused": {
              payload = {
                type: "TOKEN_UNPAUSED",
                ts: Date.now(),
                tx: log.transactionHash,
                data: { by: decoded.args.account },
              };
              break;
            }
            case "AddressFrozen": {
              const { addr, isFrozen, owner } = decoded.args;
              payload = {
                type: isFrozen ? "WALLET_FROZEN" : "WALLET_UNFROZEN",
                ts: Date.now(),
                tx: log.transactionHash,
                data: {
                  wallet: addr,
                  by: owner,
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
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "unknown";
            console.error(`    -> HCS error: ${message.slice(0, 100)}`);
          }
        }
      }

      lastBlock = currentBlock;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown";
      console.error(`  Poll error: ${message.slice(0, 100)}`);
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
