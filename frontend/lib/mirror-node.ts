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


const mirrorTokenBalanceEntrySchema = z.object({
  account: z.string(),
  balance: z.number(),
});

const mirrorTokenBalancesSchema = z.object({
  balances: z.array(mirrorTokenBalanceEntrySchema).optional(),
  links: z.object({ next: z.string().nullish() }).optional(),
});

/** Get all accounts holding a specific token with non-zero balances. */
export async function getTokenHolders(tokenId: string): Promise<string[]> {
  const accounts: string[] = [];
  let path: string | null = `/api/v1/tokens/${tokenId}/balances?account.balance=gt:0&limit=100`;

  while (path) {
    const data: z.infer<typeof mirrorTokenBalancesSchema> = await fetchMirrorNode(path, mirrorTokenBalancesSchema);
    for (const entry of data.balances ?? []) {
      accounts.push(entry.account);
    }
    path = data.links?.next ?? null;
  }
  return accounts;
}

const mirrorAccountDetailSchema = z.object({
  account: z.string(),
  evm_address: z.string(),
});

/** Resolve a Hedera account ID to an EVM address via Mirror Node. */
export async function getEvmAddress(accountId: string): Promise<string> {
  const data = await fetchMirrorNode(
    `/api/v1/accounts/${accountId}`,
    mirrorAccountDetailSchema,
  );
  return data.evm_address;
}
