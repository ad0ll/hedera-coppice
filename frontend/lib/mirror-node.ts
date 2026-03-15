import { MIRROR_NODE_URL } from "@/lib/constants";
import { withRetry } from "@/lib/retry";

/** Fetch JSON from the Hedera Mirror Node with retry logic. */
export async function fetchMirrorNode<T>(path: string): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(`${MIRROR_NODE_URL}${path}`);
    if (!res.ok) throw new Error(`Mirror Node returned ${res.status}`);
    return res.json() as Promise<T>;
  });
}

interface MirrorAccountResponse {
  account: string;
}

/** Resolve an EVM address to a Hedera account ID via Mirror Node. */
export async function getHederaAccountId(evmAddress: string): Promise<string> {
  const data = await fetchMirrorNode<MirrorAccountResponse>(
    `/api/v1/accounts/${evmAddress}`,
  );
  return data.account;
}

interface MirrorTokenEntry {
  token_id: string;
  balance: number;
}

interface MirrorTokensResponse {
  tokens?: MirrorTokenEntry[];
}

/** Get HTS token balance for a Hedera account. Returns raw balance (caller handles decimals). */
export async function getHtsTokenBalance(
  accountId: string,
  tokenId: string,
): Promise<number> {
  const data = await fetchMirrorNode<MirrorTokensResponse>(
    `/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`,
  );
  const entry = data.tokens?.find((t) => t.token_id === tokenId);
  return entry ? entry.balance : 0;
}
