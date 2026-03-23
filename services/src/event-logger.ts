/**
 * Listens for ERC-3643 Token contract events and logs them to HCS audit topic.
 * Uses polling (eth_getLogs) instead of filters since Hedera JSON-RPC
 * doesn't support eth_newFilter in batch requests.
 *
 * Events: Transfer, Paused, Unpaused, AddressFrozen, CouponSet
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
import { getClient, getOperatorKey, JSON_RPC_URL, MIRROR_NODE_URL } from "./config.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const TOKEN_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event AddressFrozen(address indexed addr, bool indexed isFrozen, address indexed owner)",
  "event CouponSet(bytes32 corporateActionId, uint256 couponId, address indexed operator, (uint256 recordDate, uint256 executionDate, uint256 startDate, uint256 endDate, uint256 fixingDate, uint256 rate, uint256 rateDecimals, uint8 rateStatus) coupon)",
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

async function getLastHcsTimestamp(topicId: string): Promise<number> {
  try {
    const res = await fetch(
      `${MIRROR_NODE_URL}/api/v1/topics/${topicId}/messages?order=desc&limit=1`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const messages = data.messages ?? [];
    if (messages.length === 0) return 0;
    const decoded = JSON.parse(Buffer.from(messages[0].message, "base64").toString());
    return decoded.ts || 0;
  } catch {
    return 0;
  }
}

async function getContractLogs(
  tokenAddress: string,
  fromTimestamp?: string,
): Promise<Array<{ topics: string[]; data: string; transaction_hash: string; block_number: number }>> {
  const logs: Array<{ topics: string[]; data: string; transaction_hash: string; block_number: number }> = [];
  let url = `${MIRROR_NODE_URL}/api/v1/contracts/${tokenAddress}/results/logs?order=asc&limit=100`;
  if (fromTimestamp) {
    url += `&timestamp=gt:${fromTimestamp}`;
  }

  while (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();
      for (const log of data.logs ?? []) {
        logs.push(log);
      }
      url = data.links?.next ? `${MIRROR_NODE_URL}${data.links.next}` : "";
    } catch {
      break;
    }
  }
  return logs;
}

async function backfill(
  client: Client,
  auditTopicId: TopicId,
  submitKey: PrivateKey,
  tokenAddress: string,
  topicIdStr: string,
): Promise<bigint> {
  console.log("  Checking for missed events to backfill...");

  const lastTs = await getLastHcsTimestamp(topicIdStr);
  if (lastTs === 0) {
    console.log("  No existing HCS messages — will backfill all contract events");
  } else {
    console.log(`  Last HCS event at ${new Date(lastTs).toISOString()}`);
  }

  const fromTimestamp = lastTs > 0 ? String(lastTs / 1000) : undefined;
  const logs = await getContractLogs(tokenAddress, fromTimestamp);

  if (logs.length === 0) {
    console.log("  No events to backfill");
    return 0n;
  }

  console.log(`  Found ${logs.length} events to backfill`);
  let maxBlock = 0n;
  let submitted = 0;

  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: TOKEN_ABI,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });

      let payload: AuditEvent | null = null;

      switch (decoded.eventName) {
        case "Transfer": {
          const { from, to, value } = decoded.args;
          payload = {
            type: from === zeroAddress ? "MINT" : "TRANSFER",
            ts: Date.now(),
            tx: log.transaction_hash,
            data: { from, to, amount: formatEther(value) },
          };
          break;
        }
        case "Paused": {
          payload = {
            type: "TOKEN_PAUSED",
            ts: Date.now(),
            tx: log.transaction_hash,
            data: { by: decoded.args.account },
          };
          break;
        }
        case "Unpaused": {
          payload = {
            type: "TOKEN_UNPAUSED",
            ts: Date.now(),
            tx: log.transaction_hash,
            data: { by: decoded.args.account },
          };
          break;
        }
        case "AddressFrozen": {
          const { addr, isFrozen, owner } = decoded.args;
          payload = {
            type: isFrozen ? "WALLET_FROZEN" : "WALLET_UNFROZEN",
            ts: Date.now(),
            tx: log.transaction_hash,
            data: { wallet: addr, by: owner },
          };
          break;
        }
        case "CouponSet": {
          payload = {
            type: "COUPON_CREATED",
            ts: Date.now(),
            tx: log.transaction_hash,
            data: { couponId: String(decoded.args.couponId) },
          };
          break;
        }
      }

      if (payload) {
        await submitToHCS(client, auditTopicId, submitKey, payload);
        submitted++;
        console.log(`    Backfilled: ${payload.type} (tx: ${log.transaction_hash.slice(0, 10)}...)`);
      }
    } catch {
      // Skip undecodable logs
    }

    if (BigInt(log.block_number) > maxBlock) {
      maxBlock = BigInt(log.block_number);
    }
  }

  console.log(`  Backfill complete: ${submitted} events submitted to HCS`);
  return maxBlock;
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

  // Backfill missed events before starting live polling
  const backfilledBlock = await backfill(client, auditTopicId, operatorKey, tokenAddress, auditTopicIdStr);
  let lastBlock = backfilledBlock > 0n
    ? backfilledBlock
    : await publicClient.getBlockNumber();
  console.log(`  Starting live polling from block: ${lastBlock}`);
  console.log(`  Listening for events...\n`);

  const seenTxs = new Map<string, number>(); // logKey -> blockNumber for pruning
  const MAX_SEEN_ENTRIES = 10_000;

  // Narrow tokenAddress to `0x${string}` once for viem's strict hex typing
  const tokenAddr = tokenAddress as `0x${string}`; // viem requires branded hex type for addresses

  // Retry buffer for events that failed HCS submission
  const retryBuffer: AuditEvent[] = [];
  const MAX_RETRY_BUFFER = 50;

  // Exponential backoff state for poll errors
  let consecutiveErrors = 0;
  const MAX_BACKOFF_MS = 60_000;

  async function drainRetryBuffer() {
    const pending = retryBuffer.splice(0, retryBuffer.length);
    for (const event of pending) {
      try {
        await submitToHCS(client, auditTopicId, operatorKey, event);
        console.log(`    -> Retry succeeded: ${event.type} (tx: ${event.tx.slice(0, 10)}...)`);
      } catch {
        if (retryBuffer.length < MAX_RETRY_BUFFER) {
          retryBuffer.push(event);
        } else {
          console.error(`    -> Retry buffer full, dropping: ${event.type} (tx: ${event.tx.slice(0, 10)}...)`);
        }
      }
    }
  }

  async function poll() {
    try {
      // Drain retry buffer before polling for new events
      if (retryBuffer.length > 0) {
        await drainRetryBuffer();
      }

      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastBlock) {
        consecutiveErrors = 0;
        return;
      }

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
            case "CouponSet": {
              const { couponId } = decoded.args;
              payload = {
                type: "COUPON_CREATED",
                ts: Date.now(),
                tx: log.transactionHash,
                data: {
                  couponId: String(couponId),
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
            if (retryBuffer.length < MAX_RETRY_BUFFER) {
              retryBuffer.push(payload);
              console.log(`    -> Queued for retry (buffer: ${retryBuffer.length}/${MAX_RETRY_BUFFER})`);
            }
          }
        }
      }

      lastBlock = currentBlock;
      consecutiveErrors = 0;
    } catch (err: unknown) {
      consecutiveErrors++;
      const message = err instanceof Error ? err.message : "unknown";
      const backoff = Math.min(POLL_INTERVAL_MS * 2 ** consecutiveErrors, MAX_BACKOFF_MS);
      console.error(`  Poll error (${consecutiveErrors}x): ${message.slice(0, 100)} — next poll in ${backoff}ms`);
      await new Promise((r) => setTimeout(r, backoff - POLL_INTERVAL_MS));
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
