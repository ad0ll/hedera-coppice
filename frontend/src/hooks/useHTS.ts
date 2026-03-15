import { useCallback } from "react";
import { MIRROR_NODE_URL, EUSD_TOKEN_ID } from "../lib/constants";

interface HtsTokenBalance {
  token_id: string;
  balance: number;
}

export function useHTS() {
  const getEusdBalance = useCallback(async (evmAddress: string): Promise<number> => {
    if (!EUSD_TOKEN_ID || !evmAddress) return 0;
    try {
      const accountRes = await fetch(
        `${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`
      );
      if (!accountRes.ok) return 0;
      const accountData: { account: string } = await accountRes.json();
      const accountId = accountData.account;

      const balRes = await fetch(
        `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}`
      );
      if (!balRes.ok) return 0;
      const balData: { tokens?: HtsTokenBalance[] } = await balRes.json();

      const tokenEntry = balData.tokens?.find(
        (t) => t.token_id === EUSD_TOKEN_ID
      );
      // eUSD has 2 decimals
      return tokenEntry ? tokenEntry.balance / 100 : 0;
    } catch {
      return 0;
    }
  }, []);

  return { getEusdBalance };
}
