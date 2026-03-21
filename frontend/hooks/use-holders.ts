"use client";

import { ethers } from "ethers";
import { useQuery } from "@tanstack/react-query";
import { tokenAbi, identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, CPC_TOKEN_ID } from "@/lib/constants";
import { getReadProvider } from "@/lib/provider";
import { getTokenHolders, getEvmAddress } from "@/lib/mirror-node";

export interface HolderInfo {
  address: string;
  balance: bigint;
  frozen: boolean;
  verified: boolean;
}

async function fetchHolderData(): Promise<HolderInfo[]> {
  const provider = getReadProvider();
  const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.token, tokenAbi, provider);
  const registryContract = new ethers.Contract(CONTRACT_ADDRESSES.identityRegistry, identityRegistryAbi, provider);

  const allAddresses = new Set<string>();
  try {
    if (CPC_TOKEN_ID) {
      const holderAccountIds = await getTokenHolders(CPC_TOKEN_ID);
      const evmPromises = holderAccountIds.map(async (accountId) => {
        try {
          return await getEvmAddress(accountId);
        } catch {
          return null;
        }
      });
      const evmAddresses = await Promise.all(evmPromises);
      for (const addr of evmAddresses) {
        if (addr) allAddresses.add(addr.toLowerCase());
      }
    }
  } catch {
    // Mirror Node unavailable
  }

  const validAddresses = [...allAddresses].filter((a) => ethers.isAddress(a));

  const promises = validAddresses.map(async (address) => {
    try {
      const [balance, frozen, verified] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.isFrozen(address).catch(() => false),
        registryContract.isVerified(address).catch(() => false),
      ]);
      return { address, balance, frozen, verified };
    } catch {
      return { address, balance: BigInt(0), frozen: false, verified: false };
    }
  });

  const results = await Promise.all(promises);
  results.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  return results;
}

/**
 * Hook that discovers token holders from Mirror Node token balances API,
 * then reads on-chain data (balance, frozen, verified).
 */
export function useHolders() {
  const { data: holders = [], isLoading } = useQuery({
    queryKey: ["holders"],
    queryFn: () => fetchHolderData(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  return { holders, loading: isLoading };
}
