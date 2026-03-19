"use client";

import { useMemo } from "react";
import { useGuardian } from "@/hooks/use-guardian";
import { formatNumber } from "@/lib/format";
import { ProgressBar } from "@/components/ui/progress-bar";

export function ProjectAllocation() {
  const { data } = useGuardian();

  const allocations = useMemo(() =>
    (data?.projects ?? [])
      .filter((p) => p.allocation)
      .map((p) => ({
        name: p.registration.ProjectName,
        category: p.registration.ICMACategory,
        amount: p.allocation!.AllocatedAmountEUSD,
      })),
    [data?.projects],
  );

  if (allocations.length === 0) {
    return (
      <div className="card-static">
        <h2 className="card-title">Use of Proceeds</h2>
        <p className="text-sm text-text-muted">No allocations recorded yet.</p>
      </div>
    );
  }

  const totalByCategory: Record<string, number> = {};
  let grandTotal = 0;
  for (const a of allocations) {
    totalByCategory[a.category] = (totalByCategory[a.category] || 0) + a.amount;
    grandTotal += a.amount;
  }

  return (
    <div className="card-static">
      <h2 className="card-title">Use of Proceeds</h2>

      <div className="space-y-2 mb-6">
        {Object.entries(totalByCategory).map(([category, total]) => {
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <div key={category}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">{category}</span>
                <span className="text-text font-mono">
                  {formatNumber(total)} eUSD ({pct.toFixed(0)}%)
                </span>
              </div>
              <ProgressBar value={total} max={grandTotal} label={`${category} allocation`} />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {allocations.map((a) => (
          <div key={a.name} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
            <div>
              <span className="text-text">{a.name}</span>
              <span className="text-xs text-text-muted ml-2">{a.category}</span>
            </div>
            <span className="font-mono text-bond-green">
              {formatNumber(a.amount)} eUSD
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
