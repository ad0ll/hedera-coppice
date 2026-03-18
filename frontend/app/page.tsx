"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@/contexts/ats-context";
import { formatBalance, formatNumber } from "@/lib/format";
import { BondDetails } from "@/components/bond-details";
import { ComplianceStatus } from "@/components/compliance-status";
import { TransferFlow } from "@/components/transfer-flow";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletIcon } from "@/components/ui/icons";
import { useTokenBalance } from "@/hooks/use-token";
import { useHTS } from "@/hooks/use-hts";
import { FaucetButton } from "@/components/faucet-button";
import { useGuardian } from "@/hooks/use-guardian";
import { ImpactSummary } from "@/components/guardian/impact-summary";

export default function InvestorPortal() {
  const { address } = useConnection();
  const { data: cpcBalanceRaw } = useTokenBalance(address);
  const { getEusdBalance } = useHTS();
  const { data: guardianData } = useGuardian();
  const [eligible, setEligible] = useState(false);
  const [eusdBalance, setEusdBalance] = useState<string>("--");

  const cpcBalance = cpcBalanceRaw != null ? formatBalance(cpcBalanceRaw) : "--";

  const refreshEusdBalance = useCallback(async () => {
    if (!address) return;
    const eusd = await getEusdBalance(address);
    setEusdBalance(formatNumber(eusd, { minimumFractionDigits: 2 }));
  }, [address, getEusdBalance]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const load = async () => {
      const eusd = await getEusdBalance(address);
      if (!cancelled) {
        setEusdBalance(formatNumber(eusd, { minimumFractionDigits: 2 }));
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, getEusdBalance]);

  const displayEusdBalance = address ? eusdBalance : "--";

  return (
    <div className="space-y-8">
      <div className="animate-entrance" style={{ "--index": 0 }}>
        <BondDetails />
      </div>


      {guardianData && (
        <div className="animate-entrance" style={{ "--index": 1 }}>
          <ImpactSummary data={guardianData} />
        </div>
      )}

      <div className="animate-entrance" style={{ "--index": 2 }}>
        <ComplianceStatus onEligibilityChange={setEligible} />
      </div>

      {address && (
        <div className="animate-entrance" style={{ "--index": 3 }}>
          <TransferFlow enabled={eligible} />
        </div>
      )}

      <div className="animate-entrance" style={{ "--index": 4 }}>
        {!address ? (
          <EmptyState
            icon={<WalletIcon className="w-6 h-6 text-text-muted" />}
            title="Portfolio"
            description="Connect a wallet to check eligibility and invest in Coppice Green Bonds."
          />
        ) : (
          <div className="bg-surface-2 border-y border-border full-bleed">
            <div className="max-w-7xl mx-auto grid grid-cols-2 divide-x divide-border">
              <div className="py-5 pr-6">
                <p className="stat-label mb-1">CPC Balance</p>
                <p className="font-display text-3xl text-white">{cpcBalance}</p>
                <p className="text-xs text-text-muted mt-1">Coppice Green Bond</p>
              </div>
              <div className="py-5 pl-6">
                <p className="stat-label mb-1">eUSD Balance</p>
                <p className="font-display text-3xl text-bond-green">{displayEusdBalance}</p>
                <p className="text-xs text-text-muted mt-1">Coppice USD</p>
                <FaucetButton onSuccess={refreshEusdBalance} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
