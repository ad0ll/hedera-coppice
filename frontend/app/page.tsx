"use client";

import { useState, useEffect } from "react";
import { useConnection } from "wagmi";
import { formatBalance } from "@/lib/format";
import { BondDetails } from "@/components/bond-details";
import { ComplianceStatus } from "@/components/compliance-status";
import { TransferFlow } from "@/components/transfer-flow";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletIcon } from "@/components/ui/icons";
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


      <div className="animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
        <ComplianceStatus onEligibilityChange={setEligible} />
      </div>

      {address && (
        <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
          <TransferFlow enabled={eligible} />
        </div>
      )}

      <div className="animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
        {!address ? (
          <EmptyState
            icon={<WalletIcon className="w-6 h-6 text-text-muted" />}
            title="Portfolio"
            description="Connect a wallet to check eligibility and invest in Coppice Green Bonds."
          />
        ) : (
          <div className="bg-surface-2 border-y border-border full-bleed">
            <div className="max-w-7xl mx-auto flex divide-x divide-border">
              <div className="flex-1 py-5 pr-6">
                <p className="stat-label mb-1">CPC Balance</p>
                <p className="font-display text-3xl text-white">{cpcBalance}</p>
                <p className="text-xs text-text-muted mt-1">Coppice Green Bond</p>
              </div>
              <div className="flex-1 py-5 pl-6">
                <p className="stat-label mb-1">eUSD Balance</p>
                <p className="font-display text-3xl text-bond-green">{displayEusdBalance}</p>
                <p className="text-xs text-text-muted mt-1">Coppice USD</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
