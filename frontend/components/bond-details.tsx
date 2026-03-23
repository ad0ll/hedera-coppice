"use client";

import { useTokenRead } from "@/hooks/use-token";
import { BOND_DETAILS } from "@/lib/constants";
import { formatBalance } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

export function BondDetails() {
  const { name, symbol, totalSupply, paused } = useTokenRead();

  const bondName = name.data || BOND_DETAILS.name;
  const bondSymbol = symbol.data || BOND_DETAILS.symbol;
  const supply = totalSupply.data != null
    ? formatBalance(totalSupply.data)
    : "--";
  const isPaused = paused.data ?? null;

  return (
    <div className="full-bleed bg-surface-2 border-y border-border pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between pt-2 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-bond-green/15 flex items-center justify-center animate-badge-enter">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 text-bond-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-3xl text-text">{bondName}</h2>
              <p className="text-sm text-text-muted mt-0.5">{BOND_DETAILS.issuer}</p>
            </div>
          </div>
          {isPaused !== null && (
            <StatusBadge label={isPaused ? "Trading Paused" : "Trading Active"} variant={isPaused ? "red" : "green"} />
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          <div>
            <p className="stat-label mb-1.5">Symbol</p>
            <p className="font-display text-2xl text-text">{bondSymbol}</p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Coupon Rate</p>
            <p className="font-display text-2xl text-bond-green">{BOND_DETAILS.couponRate}</p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Maturity</p>
            <p className="font-display text-2xl text-text">{BOND_DETAILS.maturity}</p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Total Supply</p>
            <p className="font-display text-2xl text-text">{supply} <span className="text-xs text-text-muted font-normal font-sans">{bondSymbol}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
