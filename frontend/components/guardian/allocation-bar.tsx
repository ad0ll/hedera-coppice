import { formatNumber } from "@/lib/format";
import type { GuardianProject } from "@/lib/guardian-types";
import { ProgressBar } from "@/components/ui/progress-bar";

interface AllocationBarProps {
  allocated: number;
  total: number;
  percent: number;
  projects: GuardianProject[];
}

export function AllocationBar({ allocated, total, percent, projects }: AllocationBarProps) {
  const allocatedProjects = projects.filter((p) => p.allocation);

  return (
    <div className="card-static">
      <h2 className="text-lg font-semibold text-text mb-3">Use of Proceeds</h2>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Allocated</span>
          <span className="font-mono text-text">
            {formatNumber(allocated)} / {formatNumber(total)} eUSD
          </span>
        </div>
        <ProgressBar value={allocated} max={total} label="Use of proceeds allocation" />
        <p className="text-xs text-text-muted">{percent}% allocated</p>
      </div>
      {allocatedProjects.length > 0 && (
        <div className="space-y-2 border-t border-surface-3 pt-3">
          {allocatedProjects.map((p) => (
            <div
              key={p.registration.ProjectName}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-text-muted">
                {p.registration.ProjectName}
              </span>
              <span className="font-mono text-text">
                {formatNumber(p.allocation!.AllocatedAmountEUSD)} eUSD (
                {p.allocation!.ShareofFinancingPercent}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
