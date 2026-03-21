"use client";

import { ethers } from "ethers";
import { useQuery } from "@tanstack/react-query";
import { tokenAbi, identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES, CPC_TOKEN_ID } from "@/lib/constants";
import { getReadProvider } from "@/lib/provider";
import { getTokenHolders, getEvmAddress } from "@/lib/mirror-node";
import type { AuditEvent } from "@/hooks/use-hcs-audit";

const ZERO = ethers.ZeroAddress.toLowerCase();

export interface HolderInfo {
  address: string;
  balance: bigint;
  frozen: boolean;
  verified: boolean;
}

/** Extract unique holder addresses from HCS audit MINT/TRANSFER events. */
export function extractHolderAddresses(events: AuditEvent[]): string[] {
  const seen = new Set<string>();
  for (const e of events) {
    if (e.type !== "MINT" && e.type !== "TRANSFER") continue;
    const to = e.data.to?.toLowerCase();
    const from = e.data.from?.toLowerCase();
    if (to && to !== ZERO) seen.add(to);
    if (from && from !== ZERO) seen.add(from);
  }
  return [...seen];
}

async function fetchHolderData(events: AuditEvent[]): Promise<HolderInfo[]> {
  const provider = getReadProvider();
  const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.token, tokenAbi, provider);
  const registryContract = new ethers.Contract(CONTRACT_ADDRESSES.identityRegistry, identityRegistryAbi, provider);

  // Primary: Mirror Node token balances (discovers ALL holders)
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
    // Fall through to HCS-based discovery
  }

  // Supplementary: HCS audit events
  const hcsAddresses = extractHolderAddresses(events);
  for (const addr of hcsAddresses) {
    allAddresses.add(addr.toLowerCase());
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
 * Hook that discovers token holders from Mirror Node (primary)
 * and HCS audit events (supplementary), then reads on-chain data.
 * Uses React Query for cache invalidation support.
 */
export function useHolders(events: AuditEvent[]) {
  const { data: holders = [], isLoading } = useQuery({
    queryKey: ["holders", events.length],
    queryFn: () => fetchHolderData(events),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  return { holders, loading: isLoading };
}
