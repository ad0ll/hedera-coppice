"use client";

import { useCallback } from "react";
import { usePublicClient } from "wagmi";
import { type Address } from "viem";
import { modularComplianceAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export function useCompliance() {
  const publicClient = usePublicClient();

  const canTransfer = useCallback(async (from: Address, to: Address, amount: bigint): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.compliance,
        abi: modularComplianceAbi,
        functionName: "canTransfer",
        args: [from, to, amount],
      });
    } catch {
      return false;
    }
  }, [publicClient]);

  return { canTransfer };
}
