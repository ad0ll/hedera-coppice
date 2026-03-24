"use client";

import { useTokenRead } from "@/hooks/use-token";
import { BOND_DETAILS } from "@/lib/constants";
import { formatBalance, formatNumber } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { GuardianData } from "@/lib/guardian-types";

interface BondDetailsProps {
  guardianData?: GuardianData | null;
}

export function BondDetails({ guardianData }: BondDetailsProps) {
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

        {guardianData && (
          <div className="border-t border-border mt-6 pt-5">
            <div className="flex items-center justify-between mb-4">
              <p className="stat-label">Green Bond Impact</p>
              <StatusBadge
                label={guardianData.sptMet ? "SPT Met" : "SPT Below Target"}
                variant={guardianData.sptMet ? "green" : "amber"}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mb-4">
              <div>
                <p className="stat-label mb-1.5">Verified CO₂e</p>
                <p className="font-display text-2xl text-text">
                  {formatNumber(guardianData.totalVerifiedCO2e)}
                  <span className="text-xs text-text-muted font-normal font-sans ml-1">tonnes</span>
                </p>
              </div>
              <div>
                <p className="stat-label mb-1.5">Proceeds Allocated</p>
                <p className="font-display text-2xl text-text">{guardianData.allocationPercent}%</p>
              </div>
              <div>
                <p className="stat-label mb-1.5">Projects Funded</p>
                <p className="font-display text-2xl text-text">{guardianData.projects.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">SPT Progress</span>
                <span className="font-mono text-text">
                  {formatNumber(guardianData.totalVerifiedCO2e)} / {formatNumber(guardianData.sptTarget)} tCO₂e
                </span>
              </div>
              <ProgressBar
                value={guardianData.totalVerifiedCO2e}
                max={guardianData.sptTarget}
                label="SPT Progress"
                color={guardianData.sptMet ? "green" : "amber"}
                size="sm"
              />
            </div>
            <a href="/impact" className="mt-3 inline-flex items-center text-xs text-bond-green hover:underline">
              View full impact report →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
