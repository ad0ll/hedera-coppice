"use client";

import { useTokenRead } from "@/hooks/use-token";
import { BOND_DETAILS } from "@/lib/constants";
import { formatEther } from "viem";

export function BondDetails() {
  const { totalSupply, paused } = useTokenRead();

  const supply = totalSupply.data != null
    ? Number(formatEther(totalSupply.data)).toLocaleString("en-US")
    : "--";
  const isPaused = paused.data ?? null;

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-surface-2 to-transparent pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between pt-2 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-bond-green/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-bond-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-3xl text-white">{BOND_DETAILS.name}</h1>
              <p className="text-sm text-text-muted mt-0.5">{BOND_DETAILS.issuer}</p>
            </div>
          </div>
          {isPaused !== null && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isPaused ? "bg-bond-red/15 text-bond-red" : "bg-bond-green/15 text-bond-green"}`}>
              {isPaused ? "Paused" : "Active"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="stat-label mb-1.5">Symbol</p>
            <p className="font-display text-2xl text-white">{BOND_DETAILS.symbol}</p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Coupon Rate</p>
            <p className="font-display text-2xl text-bond-green">{BOND_DETAILS.couponRate}</p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Maturity</p>
            <p className="font-display text-2xl text-white">{BOND_DETAILS.maturity}</p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Total Supply</p>
            <p className="font-display text-2xl text-white">{supply} <span className="text-xs text-text-muted font-normal font-sans">CPC</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
