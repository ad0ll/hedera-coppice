import { useHCSAudit } from "../hooks/useHCSAudit";
import { useState } from "react";

const EVENT_BADGES: Record<string, string> = {
  TRANSFER: "bg-bond-green/15 text-bond-green",
  MINT: "bg-bond-green/15 text-bond-green",
  TOKEN_PAUSED: "bg-bond-red/15 text-bond-red",
  TOKEN_UNPAUSED: "bg-bond-green/15 text-bond-green",
  WALLET_FROZEN: "bg-bond-red/15 text-bond-red",
  WALLET_UNFROZEN: "bg-bond-green/15 text-bond-green",
  PROCEEDS_ALLOCATED: "bg-bond-amber/15 text-bond-amber",
};

function formatTimestamp(ts: number | string): string {
  if (typeof ts === "string") {
    const secs = parseFloat(ts);
    return new Date(secs * 1000).toLocaleTimeString("en-US");
  }
  return new Date(ts).toLocaleTimeString("en-US");
}

export function AuditEventFeed({ topicType = "audit" }: { topicType?: "audit" | "impact" }) {
  const { events, loading } = useHCSAudit(topicType);
  const [filter, setFilter] = useState<string>("ALL");

  const eventTypes = ["ALL", ...new Set(events.map((e) => e.type))];
  const filtered = filter === "ALL" ? events : events.filter((e) => e.type === filter);
  const sorted = [...filtered].reverse();

  if (loading) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-6 card-glow">
        <h3 className="text-lg font-semibold text-white mb-4">
          {topicType === "audit" ? "Audit Event Feed" : "Impact Events"}
        </h3>
        <div className="flex items-center gap-3 text-text-muted text-sm">
          <span className="inline-block w-4 h-4 border-2 border-text-muted/40 border-t-text-muted rounded-full animate-spin" />
          Loading events from HCS...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden card-glow">
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {topicType === "audit" ? "Audit Event Feed" : "Impact Events"}
        </h3>
        <span className="text-xs text-text-muted font-mono">{events.length} events</span>
      </div>

      {eventTypes.length > 1 && (
        <div className="flex gap-1.5 px-6 py-3 border-b border-border/30 flex-wrap">
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`text-xs px-3 py-2 min-h-[44px] min-w-[44px] rounded-md transition-colors ${
                filter === type
                  ? "bg-surface-3 text-white border border-border/50"
                  : "text-text-muted hover:text-white hover:bg-surface-3/50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      <div className="px-6 py-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No events recorded yet.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {sorted.map((event, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0">
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${EVENT_BADGES[event.type] || "bg-surface-3 text-text-muted"}`}>
                  {event.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{formatTimestamp(event.consensusTimestamp || event.ts)}</span>
                    {event.tx && (
                      <a
                        href={`https://hashscan.io/testnet/transaction/${event.tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bond-green/50 hover:text-bond-green font-mono transition-colors"
                      >
                        {event.tx.slice(0, 10)}...
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {Object.entries(event.data || {}).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <span className="text-text-muted/50">{k}:</span>{" "}
                        <span className="text-white/70 font-mono">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
