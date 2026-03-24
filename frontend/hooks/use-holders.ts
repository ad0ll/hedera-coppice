"use client";

import { ethers } from "ethers";
import { useQuery } from "@tanstack/react-query";
import { tokenAbi, identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { getReadProvider } from "@/lib/provider";
import { getErc20Holders } from "@/lib/mirror-node";

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

  let validAddresses: string[] = [];
  try {
    // ATS bonds are ERC-20 contracts, not HTS tokens — discover holders
    // by scanning Transfer event logs from Mirror Node contract logs API.
    const discovered = await getErc20Holders(CONTRACT_ADDRESSES.token);
    validAddresses = discovered.filter((a) => ethers.isAddress(a));
  } catch {
    // Mirror Node unavailable
  }

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
  return results
    .filter((h) => h.balance > BigInt(0))
    .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
}

/**
 * Hook that discovers token holders from Mirror Node contract Transfer logs,
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
