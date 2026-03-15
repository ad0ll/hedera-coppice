"use client";

import { usePublicClient } from "wagmi";
import { type Address, zeroAddress } from "viem";
import { identityRegistryAbi } from "@coppice/abi";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

export function useIdentity() {
  const publicClient = usePublicClient();

  const isVerified = async (address: Address): Promise<boolean> => {
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
  };

  const getCountry = async (address: Address): Promise<number> => {
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
  };

  const getIdentity = async (address: Address): Promise<Address> => {
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
  };

  const isRegistered = async (address: Address): Promise<boolean> => {
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
  };

  return { isVerified, getCountry, getIdentity, isRegistered };
}
