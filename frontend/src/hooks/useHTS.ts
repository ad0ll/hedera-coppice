import { useState, useCallback } from "react";
import { MIRROR_NODE_URL, EUSD_TOKEN_ID } from "../lib/constants";

export function useHTS() {
  const [loading, setLoading] = useState(false);

  const getEusdBalance = useCallback(async (evmAddress: string): Promise<number> => {
    if (!EUSD_TOKEN_ID || !evmAddress) return 0;
    setLoading(true);
    try {
      // First resolve EVM address to Hedera account ID
      const accountRes = await fetch(
        `${MIRROR_NODE_URL}/api/v1/accounts/${evmAddress}`
      );
      if (!accountRes.ok) return 0;
      const accountData = await accountRes.json();
      const accountId = accountData.account;

      // Then get token balances for that account
      const balRes = await fetch(
        `${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?token.id=${EUSD_TOKEN_ID}`
      );
      if (!balRes.ok) return 0;
      const balData = await balRes.json();

      const tokenEntry = balData.tokens?.find(
        (t: any) => t.token_id === EUSD_TOKEN_ID
      );
      // eUSD has 2 decimals
      return tokenEntry ? tokenEntry.balance / 100 : 0;
    } catch {
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getEusdBalance, loading };
}
