"use client";

import { useCallback } from "react";
import { EUSD_TOKEN_ID } from "@/lib/constants";
import { getHederaAccountId, getHtsTokenBalance } from "@/lib/mirror-node";

export function useHTS() {
  const getEusdBalance = useCallback(async (evmAddress: string): Promise<number> => {
    if (!EUSD_TOKEN_ID || !evmAddress) return 0;
    try {
      const accountId = await getHederaAccountId(evmAddress);
      const rawBalance = await getHtsTokenBalance(accountId, EUSD_TOKEN_ID);
      return rawBalance / 100; // eUSD has 2 decimals
    } catch {
      return 0;
    }
  }, []);

  return { getEusdBalance };
}
