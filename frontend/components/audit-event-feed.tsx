"use client";

import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { EVENT_BADGE_CLASSES } from "@/lib/event-types";
import { formatTimestamp } from "@/lib/format";
import { WarningIcon, Spinner, ExternalLinkIcon } from "@/components/ui/icons";
import { useState, useMemo } from "react";

export function AuditEventFeed({ topicType = "audit" }: { topicType?: "audit" | "impact" }) {
  const { events, loading, topicMissing } = useHCSAudit(topicType);
  const [filter, setFilter] = useState<string>("ALL");

  const eventTypes = useMemo(() => ["ALL", ...new Set(events.map((e) => e.type))], [events]);
  const filtered = useMemo(() => filter === "ALL" ? events : events.filter((e) => e.type === filter), [events, filter]);
  const sorted = useMemo(() => [...filtered].reverse(), [filtered]);

  if (topicMissing) {
    return (
      <div className="card">
        <h3 className="card-title">
          {topicType === "audit" ? "Audit Event Feed" : "Impact Events"}
        </h3>
        <div className="flex items-center gap-3 text-bond-amber text-sm" role="alert">
          <WarningIcon className="w-5 h-5 shrink-0" />
          Audit topic not configured — event trail unavailable.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h3 className="card-title">
          {topicType === "audit" ? "Audit Event Feed" : "Impact Events"}
        </h3>
        <div className="flex items-center gap-3 text-text-muted text-sm" role="status">
          <Spinner className="w-4 h-4" aria-hidden />
          Loading events from Hedera...
        </div>
      </div>
    );
  }

  return (
    <div className="card-flush">
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
            {sorted.map((event) => (
              <div key={event.sequenceNumber} className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0 animate-feed-enter">
                <span className={`text-[11px] px-2 py-0.5 rounded font-mono shrink-0 ${EVENT_BADGE_CLASSES[event.type] || "bg-surface-3 text-text-muted"}`}>
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
                        className="text-bond-green hover:text-bond-green/80 font-mono transition-colors inline-flex items-center gap-1"
                        title={event.tx}
                      >
                        {event.tx.slice(0, 10)}...
                        <ExternalLinkIcon />
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
