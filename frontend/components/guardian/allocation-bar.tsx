import { formatNumber } from "@/lib/format";
import type { GuardianProject } from "@/lib/guardian-types";

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
      <h2 className="text-lg font-semibold text-white mb-3">Use of Proceeds</h2>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Allocated</span>
          <span className="font-mono text-white">
            {formatNumber(allocated)} / {formatNumber(total)} eUSD
          </span>
        </div>
        <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-bond-green rounded-full transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
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
              <span className="font-mono text-white">
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
