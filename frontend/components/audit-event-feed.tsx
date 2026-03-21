"use client";

import { useContractEvents } from "@/hooks/use-contract-events";
import { EVENT_BADGE_CLASSES } from "@/lib/event-types";
import { formatTimestamp } from "@/lib/format";
import { Spinner } from "@/components/ui/icons";
import { TxLink } from "@/components/ui/hashscan-link";
import { useState, useMemo } from "react";

export function AuditEventFeed() {
  const { events, loading } = useContractEvents();
  const [filter, setFilter] = useState<string>("ALL");

  const { eventTypes, sorted } = useMemo(() => {
    const types = ["ALL", ...new Set(events.map((e) => e.type))];
    const filtered = filter === "ALL" ? events : events.filter((e) => e.type === filter);
    return { eventTypes: types, sorted: [...filtered].reverse() };
  }, [events, filter]);

  if (loading) {
    return (
      <div className="card">
        <h2 className="card-title">Audit Event Feed</h2>
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
        <h2 className="text-lg font-semibold text-text">Audit Event Feed</h2>
        <span className="text-xs text-text-muted font-mono">{events.length} events</span>
      </div>

      {eventTypes.length > 1 && (
        <div role="group" aria-label="Filter by event type" className="flex gap-1.5 px-6 py-3 border-b border-border/30 flex-wrap">
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              aria-pressed={filter === type}
              className={`text-xs px-3 py-2 min-h-[44px] min-w-[44px] rounded-md transition-all duration-200 ${
                filter === type
                  ? "bg-surface-3 text-text border border-border/50 shadow-sm"
                  : "text-text-muted hover:text-text hover:bg-surface-3/50 border border-transparent"
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
              <div key={event.sequenceNumber} className={`flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0${i < 10 ? " animate-feed-enter" : ""}`}>
                <span className={`text-[11px] sm:text-xs px-2 py-0.5 rounded font-mono shrink-0 ${EVENT_BADGE_CLASSES[event.type] || "bg-surface-3 text-text-muted"}`}>
                  {event.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{formatTimestamp(event.consensusTimestamp || event.ts)}</span>
                    {event.tx && (
                      <TxLink hash={event.tx} prefixLen={10} />
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {Object.entries(event.data || {}).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <span className="text-text-muted">{k}:</span>{" "}
                        <span className="text-text font-mono">{v}</span>
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
