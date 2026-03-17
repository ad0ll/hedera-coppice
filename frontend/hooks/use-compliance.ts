"use client";

import { useCallback } from "react";
import { ethers } from "ethers";
import { modularComplianceAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, JSON_RPC_URL } from "@/lib/constants";

export function useCompliance() {
  const canTransfer = useCallback(async (from: string, to: string, amount: bigint): Promise<boolean> => {
    try {
      const provider = new ethers.JsonRpcProvider(JSON_RPC_URL);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.compliance,
        modularComplianceAbi,
        provider,
      );
      return await contract.canTransfer(from, to, amount);
    } catch {
      return false;
    }
  }, []);

  return { canTransfer };
}
