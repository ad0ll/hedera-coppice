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

// Exported for use in use-hcs-audit.ts and faucet-button.tsx
export const mirrorTopicMessageSchema = z.object({
  sequence_number: z.number(),
  message: z.string(),
  consensus_timestamp: z.string(),
});

export const mirrorTopicMessagesResponseSchema = z.object({
  messages: z.array(mirrorTopicMessageSchema).optional(),
  links: z.object({ next: z.string().nullish() }).optional(),
});
export type MirrorTopicMessage = z.infer<typeof mirrorTopicMessageSchema>;
export type MirrorTopicMessagesResponse = z.infer<
  typeof mirrorTopicMessagesResponseSchema
>;
