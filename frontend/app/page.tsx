"use client";

import { useState, useEffect } from "react";
import { useConnection } from "wagmi";
import { formatBalance } from "@/lib/format";
import { BondDetails } from "@/components/bond-details";
import { ComplianceStatus } from "@/components/compliance-status";
import { TransferFlow } from "@/components/transfer-flow";
import { Card } from "@/components/ui/card";
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

  // Reset eUSD balance display when wallet disconnects
  const displayEusdBalance = address ? eusdBalance : "--";

  return (
    <div className="space-y-6">
      <BondDetails />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ComplianceStatus onEligibilityChange={setEligible} />
          <TransferFlow enabled={eligible} />
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="card-title">Portfolio</h3>
            {!address ? (
              <p className="text-sm text-text-muted">Connect wallet to view portfolio.</p>
            ) : (
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
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
