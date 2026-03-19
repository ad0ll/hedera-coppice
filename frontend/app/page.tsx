"use client";

import { useState } from "react";
import { useConnection } from "@/contexts/ats-context";
import { formatBalance, formatNumber } from "@/lib/format";
import { BondDetails } from "@/components/bond-details";
import { ComplianceStatus } from "@/components/compliance-status";
import { TransferFlow } from "@/components/transfer-flow";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletIcon } from "@/components/ui/icons";
import { useTokenBalance } from "@/hooks/use-token";
import { useEusdBalance, useInvalidateEusdBalance } from "@/hooks/use-eusd-balance";
import { FaucetButton } from "@/components/faucet-button";
import { useGuardian } from "@/hooks/use-guardian";
import { ImpactSummary } from "@/components/guardian/impact-summary";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { entranceProps } from "@/lib/animation";

export default function InvestorPortal() {
  const { address } = useConnection();
  const { data: cpcBalanceRaw } = useTokenBalance(address);
  const { data: eusdBalanceRaw } = useEusdBalance(address);
  const invalidateEusd = useInvalidateEusdBalance();
  const { data: guardianData } = useGuardian();
  const [eligible, setEligible] = useState(false);

  const cpcBalance = cpcBalanceRaw != null ? formatBalance(cpcBalanceRaw) : "--";
  const displayEusdBalance = address && eusdBalanceRaw != null
    ? formatNumber(eusdBalanceRaw, { minimumFractionDigits: 2 })
    : "--";

  return (
    <div className="space-y-8">
      <div {...entranceProps(0)}>
        <BondDetails />
      </div>


      {guardianData && (
        <div {...entranceProps(1)}>
          <SectionErrorBoundary section="impact summary">
            <ImpactSummary data={guardianData} />
          </SectionErrorBoundary>
        </div>
      )}

      <div {...entranceProps(2)}>
        <SectionErrorBoundary section="compliance checks">
          <ComplianceStatus onEligibilityChange={setEligible} />
        </SectionErrorBoundary>
      </div>

      {address && (
        <div {...entranceProps(3)}>
          <SectionErrorBoundary section="purchase flow">
            <TransferFlow enabled={eligible} />
          </SectionErrorBoundary>
        </div>
      )}

      <div {...entranceProps(4)}>
        {!address ? (
          <EmptyState
            icon={<WalletIcon className="w-6 h-6 text-text-muted" />}
            title="Portfolio"
            description="Connect a wallet to check eligibility and invest in Coppice Green Bonds."
          />
        ) : (
          <div className="bg-surface-2 border-y border-border full-bleed">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="py-5 sm:pr-6">
                <p className="stat-label mb-1">CPC Balance</p>
                <p className="font-display text-3xl text-text">{cpcBalance}</p>
                <p className="text-xs text-text-muted mt-1">Coppice Green Bond</p>
              </div>
              <div className="py-5 sm:pl-6">
                <p className="stat-label mb-1">eUSD Balance</p>
                <p className="font-display text-3xl text-bond-green">{displayEusdBalance}</p>
                <p className="text-xs text-text-muted mt-1">Coppice USD</p>
                <FaucetButton onSuccess={invalidateEusd} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
