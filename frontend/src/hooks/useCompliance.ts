import { useCallback } from "react";
import { getComplianceContract } from "../lib/contracts";
import { readProvider } from "../lib/provider";

export function useCompliance() {
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
