"use client";

import { useState, useEffect } from "react";
import { useConnection } from "wagmi";
import { formatBalance } from "@/lib/format";
import { BondDetails } from "@/components/bond-details";
import { ComplianceStatus } from "@/components/compliance-status";
import { TransferFlow } from "@/components/transfer-flow";
import { EmptyState } from "@/components/ui/empty-state";
import { useTokenBalance } from "@/hooks/use-token";
import { useHTS } from "@/hooks/use-hts";

export default function InvestorPortal() {
  const { address } = useConnection();
  const { data: cpcBalanceRaw } = useTokenBalance(address);
  const { getEusdBalance } = useHTS();
  const [eligible, setEligible] = useState(false);
  const [eusdBalance, setEusdBalance] = useState<string>("--");

  const cpcBalance = cpcBalanceRaw != null ? formatBalance(cpcBalanceRaw) : "--";

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const load = async () => {
      const eusd = await getEusdBalance(address);
      if (!cancelled) {
        setEusdBalance(eusd.toLocaleString("en-US", { minimumFractionDigits: 2 }));
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
      <div className="animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>
        <BondDetails />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
            <ComplianceStatus onEligibilityChange={setEligible} />
          </div>
          {address && (
            <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
              <TransferFlow enabled={eligible} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
            {!address ? (
              <EmptyState
                icon={<svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" /></svg>}
                title="Portfolio"
                description="Connect a wallet to check eligibility and invest in Coppice Green Bonds."
              />
            ) : (
              <div className="card-static">
                <h3 className="card-title">Portfolio</h3>
                <div className="space-y-3">
                  <div className="bg-surface-3/70 rounded-lg p-4 border border-border/30">
                    <p className="stat-label mb-1">CPC Balance</p>
                    <p className="text-2xl font-mono font-semibold text-white">{cpcBalance}</p>
                    <p className="text-xs text-text-muted mt-1">Coppice Green Bond</p>
                  </div>
                  <div className="bg-surface-3/70 rounded-lg p-4 border border-border/30">
                    <p className="stat-label mb-1">eUSD Balance</p>
                    <p className="text-2xl font-mono font-semibold text-bond-green">{displayEusdBalance}</p>
                    <p className="text-xs text-text-muted mt-1">Coppice USD (HTS)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
