"use client";

import { useCallback } from "react";
import { usePublicClient } from "wagmi";
import { type Address, zeroAddress } from "viem";
import { identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export function useIdentity() {
  const publicClient = usePublicClient();

  const isVerified = useCallback(async (address: Address): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "isVerified",
        args: [address],
      });
    } catch {
      return false;
    }
  }, [publicClient]);

  const getCountry = useCallback(async (address: Address): Promise<number> => {
    if (!publicClient) return 0;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "investorCountry",
        args: [address],
      });
    } catch {
      return 0;
    }
  }, [publicClient]);

  const getIdentity = useCallback(async (address: Address): Promise<Address> => {
    if (!publicClient) return zeroAddress;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "identity",
        args: [address],
      });
    } catch {
      return zeroAddress;
    }
  }, [publicClient]);

  const isRegistered = useCallback(async (address: Address): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      return await publicClient.readContract({
        address: CONTRACT_ADDRESSES.identityRegistry,
        abi: identityRegistryAbi,
        functionName: "contains",
        args: [address],
      });
    } catch {
      return false;
    }
  }, [publicClient]);

  return { isVerified, getCountry, getIdentity, isRegistered };
}
