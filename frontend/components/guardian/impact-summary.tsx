import { formatNumber } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { SptStatus } from "@/components/guardian/spt-status";
import type { GuardianData } from "@/lib/guardian-types";

interface ImpactSummaryProps {
  data: GuardianData;
}

export function ImpactSummary({ data }: ImpactSummaryProps) {
  return (
    <div className="card-static">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text">Green Bond Impact</h2>
        <StatusBadge
          label={data.sptMet ? "SPT Met" : "SPT Below Target"}
          variant={data.sptMet ? "green" : "amber"}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 mb-4">
        <div>
          <p className="stat-label mb-1">Verified CO₂e</p>
          <p className="font-mono text-lg text-text">
            {formatNumber(data.totalVerifiedCO2e)}
            <span className="text-xs text-text-muted ml-1">tonnes</span>
          </p>
        </div>
        <div>
          <p className="stat-label mb-1">Proceeds Allocated</p>
          <p className="font-mono text-lg text-text">
            {data.allocationPercent}%
          </p>
        </div>
        <div>
          <p className="stat-label mb-1">Projects Funded</p>
          <p className="font-mono text-lg text-text">
            {data.projects.length}
          </p>
        </div>
      </div>
      <SptStatus
        totalVerified={data.totalVerifiedCO2e}
        target={data.sptTarget}
        met={data.sptMet}
        variant="compact"
      />
      <a href="/impact" className="mt-3 inline-flex items-center text-xs text-bond-green hover:underline">
        View full impact report →
      </a>
    </div>
  );
}
