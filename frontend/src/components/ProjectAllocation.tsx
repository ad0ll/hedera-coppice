import { useHCSAudit } from "../hooks/useHCSAudit";

const CATEGORY_COLORS: Record<string, string> = {
  "Renewable Energy": "bg-bond-green",
  "Energy Efficiency": "bg-blue-500",
  "Clean Transportation": "bg-purple-500",
  "Sustainable Water": "bg-cyan-500",
  "Green Buildings": "bg-emerald-500",
  Other: "bg-gray-500",
};

interface Allocation {
  project: string;
  category: string;
  amount: number;
  currency: string;
}

export function ProjectAllocation() {
  const { events } = useHCSAudit("impact");

  const allocations: Allocation[] = events
    .filter((e) => e.type === "PROCEEDS_ALLOCATED")
    .map((e) => ({
      project: e.data.project || "Unknown",
      category: e.data.category || "Other",
      amount: parseFloat(e.data.amount || "0"),
      currency: e.data.currency || "USD",
    }));

  const totalByCategory: Record<string, number> = {};
  let grandTotal = 0;
  for (const a of allocations) {
    totalByCategory[a.category] = (totalByCategory[a.category] || 0) + a.amount;
    grandTotal += a.amount;
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Use of Proceeds</h3>

      {allocations.length === 0 ? (
        <p className="text-sm text-text-muted">No allocations recorded yet.</p>
      ) : (
        <>
          {/* Simple bar chart */}
          <div className="space-y-2 mb-6">
            {Object.entries(totalByCategory).map(([category, total]) => {
              const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">{category}</span>
                    <span className="text-white font-mono">
                      ${total.toLocaleString("en-US")} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_COLORS[category] || CATEGORY_COLORS.Other}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project list */}
          <div className="space-y-2">
            {allocations.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                <div>
                  <span className="text-white">{a.project}</span>
                  <span className="text-xs text-text-muted ml-2">{a.category}</span>
                </div>
                <span className="font-mono text-bond-green">
                  ${a.amount.toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
