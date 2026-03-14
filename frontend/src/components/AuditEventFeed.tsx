import { useHCSAudit } from "../hooks/useHCSAudit";
import { useState } from "react";

const EVENT_BADGES: Record<string, string> = {
  TRANSFER: "bg-bond-green/20 text-bond-green",
  MINT: "bg-bond-green/20 text-bond-green",
  TOKEN_PAUSED: "bg-bond-red/20 text-bond-red",
  TOKEN_UNPAUSED: "bg-bond-green/20 text-bond-green",
  WALLET_FROZEN: "bg-bond-red/20 text-bond-red",
  WALLET_UNFROZEN: "bg-bond-green/20 text-bond-green",
  PROCEEDS_ALLOCATED: "bg-bond-amber/20 text-bond-amber",
};

function formatTimestamp(ts: number | string): string {
  if (typeof ts === "string") {
    const secs = parseFloat(ts);
    return new Date(secs * 1000).toLocaleTimeString();
  }
  return new Date(ts).toLocaleTimeString();
}

export function AuditEventFeed({ topicType = "audit" }: { topicType?: "audit" | "impact" }) {
  const { events, loading } = useHCSAudit(topicType);
  const [filter, setFilter] = useState<string>("ALL");

  const eventTypes = ["ALL", ...new Set(events.map((e) => e.type))];
  const filtered = filter === "ALL" ? events : events.filter((e) => e.type === filter);
  const sorted = [...filtered].reverse(); // newest first

  if (loading) {
    return (
      <div className="bg-surface-2 border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Audit Event Feed</h3>
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <span className="inline-block w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
          Loading events from HCS...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {topicType === "audit" ? "Audit Event Feed" : "Impact Events"}
        </h3>
        <span className="text-xs text-text-muted">{events.length} events</span>
      </div>

      {eventTypes.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                filter === type
                  ? "bg-surface-3 text-white"
                  : "text-text-muted hover:text-white"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-text-muted">No events recorded yet.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sorted.map((event, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${EVENT_BADGES[event.type] || "bg-surface-3 text-text-muted"}`}>
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
                      className="text-bond-green/60 hover:text-bond-green font-mono"
                    >
                      {event.tx.slice(0, 10)}...
                    </a>
                  )}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {Object.entries(event.data || {}).map(([k, v]) => (
                    <span key={k} className="mr-3">
                      <span className="text-text-muted/60">{k}:</span>{" "}
                      <span className="text-white/80 font-mono">{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
