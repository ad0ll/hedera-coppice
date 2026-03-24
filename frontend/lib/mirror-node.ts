import { z } from "zod";
import { MIRROR_NODE_URL } from "@/lib/constants";
import { withRetry } from "@/lib/retry";

/** Fetch JSON from the Hedera Mirror Node with retry logic and Zod validation. */
export async function fetchMirrorNode<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(`${MIRROR_NODE_URL}${path}`);
    if (!res.ok) throw new Error(`Mirror Node returned ${res.status}`);
    const json = await res.json();
    return schema.parse(json);
  });
}

const mirrorAccountSchema = z.object({
  account: z.string(),
});

/** Resolve an EVM address to a Hedera account ID via Mirror Node. */
export async function getHederaAccountId(
  evmAddress: string,
): Promise<string> {
  const data = await fetchMirrorNode(
    `/api/v1/accounts/${evmAddress}`,
    mirrorAccountSchema,
  );
  return data.account;
}

const mirrorTokenEntrySchema = z.object({
  token_id: z.string(),
  balance: z.number(),
});

const mirrorTokensSchema = z.object({
  tokens: z.array(mirrorTokenEntrySchema).optional(),
});

/** Get HTS token balance for a Hedera account. Returns raw balance (caller handles decimals). */
export async function getHtsTokenBalance(
  accountId: string,
  tokenId: string,
): Promise<number> {
  const data = await fetchMirrorNode(
    `/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`,
    mirrorTokensSchema,
  );
  const entry = data.tokens?.find((t) => t.token_id === tokenId);
  return entry ? entry.balance : 0;
}


const contractLogSchema = z.object({
  topics: z.array(z.string()),
  transaction_hash: z.string().optional(),
  data: z.string().optional(),
});

const contractLogsSchema = z.object({
  logs: z.array(contractLogSchema).optional(),
  links: z.object({ next: z.string().nullish() }).optional(),
});

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_ADDR = "0x" + "0".repeat(40);

/**
 * Discover all addresses that have ever sent or received an ERC-20 Transfer
 * for a contract by scanning Mirror Node contract logs. Returns lowercase
 * EVM addresses (no account-ID-to-EVM resolution needed).
 */
export async function getErc20Holders(contractAddress: string): Promise<string[]> {
  const addresses = new Set<string>();
  let path: string | null =
    `/api/v1/contracts/${contractAddress}/results/logs?order=asc&limit=100`;

  while (path) {
    const data: z.infer<typeof contractLogsSchema> = await fetchMirrorNode(path, contractLogsSchema);
    for (const log of data.logs ?? []) {
      const topics = log.topics;
      if (topics[0] !== TRANSFER_TOPIC || topics.length < 3) continue;
      const from = "0x" + topics[1].slice(26);
      const to = "0x" + topics[2].slice(26);
      if (from !== ZERO_ADDR) addresses.add(from);
      addresses.add(to);
    }
    path = data.links?.next ?? null;
  }
  return [...addresses];
}

/** Fetch all logs matching a specific topic0 from a contract (client-side filter). */
export async function getContractLogsByTopic(
  contractAddress: string,
  topic0: string,
): Promise<z.infer<typeof contractLogSchema>[]> {
  const results: z.infer<typeof contractLogSchema>[] = [];
  let path: string | null =
    `/api/v1/contracts/${contractAddress}/results/logs?order=asc&limit=100`;

  while (path) {
    const data: z.infer<typeof contractLogsSchema> = await fetchMirrorNode(path, contractLogsSchema);
    for (const log of data.logs ?? []) {
      if (log.topics[0] === topic0) {
        results.push(log);
      }
    }
    path = data.links?.next ?? null;
  }
  return results;
}
