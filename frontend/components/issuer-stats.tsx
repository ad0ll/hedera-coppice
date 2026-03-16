"use client";

import { formatBalance } from "@/lib/format";
import type { HolderInfo } from "@/hooks/use-holders";

interface IssuerStatsProps {
  totalSupply: bigint | undefined;
  isPaused: boolean | null;
  holders: HolderInfo[];
  totalAllocated: number;
}

export function IssuerStats({ totalSupply, isPaused, holders, totalAllocated }: IssuerStatsProps) {
  const holderCount = holders.filter((h) => h.balance > BigInt(0)).length;
  const frozenCount = holders.filter((h) => h.frozen).length;
  const supplyDisplay = totalSupply != null ? formatBalance(totalSupply) : "--";

  return (
    <div className="bg-surface-2 border-y border-border full-bleed">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
        <div className="py-5 pr-6">
          <p className="stat-label mb-1">Total Supply</p>
          <p className="font-display text-3xl text-white">{supplyDisplay}</p>
          <p className="text-xs text-text-muted mt-1">CPC minted</p>
        </div>
        <div className="py-5 px-6">
          <p className="stat-label mb-1">Holders</p>
          <p className="font-display text-3xl text-white">{holderCount}</p>
          {frozenCount > 0 ? (
            <p className="text-xs text-bond-red mt-1">{frozenCount} frozen</p>
          ) : (
            <p className="text-xs text-text-muted mt-1">Active accounts</p>
          )}
        </div>
        <div className="py-5 px-6">
          <p className="stat-label mb-1">Token Status</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? "bg-bond-red" : "bg-bond-green animate-pulse-dot"}`} />
            <p className="font-display text-3xl" style={{ color: isPaused === null ? undefined : isPaused ? "var(--color-bond-red)" : "var(--color-bond-green)" }}>
              {isPaused === null ? "--" : isPaused ? "Paused" : "Active"}
            </p>
          </div>
        </div>
        <div className="py-5 pl-6">
          <p className="stat-label mb-1">Proceeds Allocated</p>
          <p className="font-display text-3xl text-bond-amber">
            {totalAllocated > 0 ? `$${totalAllocated.toLocaleString("en-US")}` : "--"}
          </p>
          <p className="text-xs text-text-muted mt-1">Use of proceeds</p>
        </div>
      </div>
    </div>
  );
}
