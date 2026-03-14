import { useCallback } from "react";
import { ethers } from "ethers";
import { getComplianceContract } from "../lib/contracts";
import { JSON_RPC_URL } from "../lib/constants";

export function useCompliance() {
  const readProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  const readContract = getComplianceContract(readProvider);

  const canTransfer = useCallback(async (from: string, to: string, amount: bigint): Promise<boolean> => {
    try {
      return await readContract.canTransfer(from, to, amount);
    } catch {
      return false;
    }
  }, []);

  return { canTransfer };
}
