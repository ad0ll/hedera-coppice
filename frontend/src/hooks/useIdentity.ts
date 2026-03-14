import { useCallback } from "react";
import { ethers } from "ethers";
import { getIdentityRegistryContract } from "../lib/contracts";
import { JSON_RPC_URL } from "../lib/constants";

export function useIdentity() {
  const readProvider = new ethers.JsonRpcProvider(JSON_RPC_URL);
  const readContract = getIdentityRegistryContract(readProvider);

  const isVerified = useCallback(async (address: string): Promise<boolean> => {
    try {
      return await readContract.isVerified(address);
    } catch {
      return false;
    }
  }, []);

  const getCountry = useCallback(async (address: string): Promise<number> => {
    try {
      return Number(await readContract.investorCountry(address));
    } catch {
      return 0;
    }
  }, []);

  const getIdentity = useCallback(async (address: string): Promise<string> => {
    try {
      return await readContract.identity(address);
    } catch {
      return ethers.ZeroAddress;
    }
  }, []);

  const isRegistered = useCallback(async (address: string): Promise<boolean> => {
    try {
      return await readContract.contains(address);
    } catch {
      return false;
    }
  }, []);

  return { isVerified, getCountry, getIdentity, isRegistered };
}
