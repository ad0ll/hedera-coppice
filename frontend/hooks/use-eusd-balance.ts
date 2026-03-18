"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { EUSD_TOKEN_ID } from "@/lib/constants";
import { getHederaAccountId, getHtsTokenBalance } from "@/lib/mirror-node";
import { eusdFromRaw } from "@/lib/format";

async function fetchEusdBalance(evmAddress: string): Promise<number> {
  if (!EUSD_TOKEN_ID || !evmAddress) return 0;
  try {
    const accountId = await getHederaAccountId(evmAddress);
    const rawBalance = await getHtsTokenBalance(accountId, EUSD_TOKEN_ID);
    return eusdFromRaw(rawBalance);
  } catch {
    return 0;
  }
}

export function useEusdBalance(address: string | undefined) {
  return useQuery({
    queryKey: ["eusd-balance", address],
    queryFn: () => fetchEusdBalance(address!),
    enabled: !!address,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useInvalidateEusdBalance() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["eusd-balance"] }),
    [queryClient],
  );
}
