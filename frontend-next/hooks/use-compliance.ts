"use client";

import { usePublicClient } from "wagmi";
import { type Address } from "viem";
import { modularComplianceAbi } from "@coppice/abi";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export function useCompliance() {
  const publicClient = usePublicClient();

  const canTransfer = async (from: Address, to: Address, amount: bigint): Promise<boolean> => {
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
  };

  return { canTransfer };
}
