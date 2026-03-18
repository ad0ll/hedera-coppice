"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ethers } from "ethers";
import { tokenAbi, identityRegistryAbi } from "@coppice/common";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { getReadProvider } from "@/lib/provider";
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

/**
 * Hook that derives token holders from HCS audit events, then reads
 * balanceOf, isFrozen, and isVerified for each address.
 */
export function useHolders(events: AuditEvent[]) {
  const [holders, setHolders] = useState<HolderInfo[]>([]);
  const [fetched, setFetched] = useState(false);
  const prevAddressKeyRef = useRef<string>("");

  const addresses = useMemo(() => extractHolderAddresses(events), [events]);
  const addressKey = useMemo(() => [...addresses].sort().join(","), [addresses]);

  const canFetch = addresses.length > 0;

  useEffect(() => {
    if (!canFetch) return;

    // Skip if addresses haven't changed and we already have data
    if (addressKey === prevAddressKeyRef.current && fetched) return;
    prevAddressKeyRef.current = addressKey;

    let cancelled = false;

    async function fetchHolderData() {
      const provider = getReadProvider();
      const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.token, tokenAbi, provider);
      const registryContract = new ethers.Contract(CONTRACT_ADDRESSES.identityRegistry, identityRegistryAbi, provider);

      const validAddresses = addresses.filter((a) => ethers.isAddress(a));

      const promises = validAddresses.map(async (address) => {
        try {
          const [balance, frozen, verified] = await Promise.all([
            tokenContract.balanceOf(address),
            tokenContract.isFrozen(address),
            registryContract.isVerified(address),
          ]);
          return { address, balance, frozen, verified };
        } catch {
          return { address, balance: BigInt(0), frozen: false, verified: false };
        }
      });

      const results = await Promise.all(promises);

      if (!cancelled) {
        results.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
        setHolders(results);
        setFetched(true);
      }
    }

    fetchHolderData();
    const interval = setInterval(fetchHolderData, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [addressKey, addresses, canFetch, fetched]);

  // Derive loading from state: loading if we can fetch but haven't yet, or if there are events but no addresses resolved
  const loading = canFetch ? !fetched : events.length > 0 && !fetched;

  return { holders, loading };
}
