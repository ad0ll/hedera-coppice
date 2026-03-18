"use client";

import type React from "react";
import { EVENT_BADGE_CLASSES } from "@/lib/event-types";
import { formatTimestamp } from "@/lib/format";
import { Spinner } from "@/components/ui/icons";
import { AddressLink, TxLink } from "@/components/ui/hashscan-link";
import type { AuditEvent } from "@/hooks/use-hcs-audit";

function eventSummary(event: AuditEvent): React.ReactNode {
  const d = event.data;
  switch (event.type) {
    case "MINT":
      return <>Minted {d.amount ?? "?"} CPC to <AddressLink address={d.to ?? ""} /></>;
    case "TRANSFER":
      return <><AddressLink address={d.from ?? ""} /> sent {d.amount ?? "?"} CPC to <AddressLink address={d.to ?? ""} /></>;
    case "TOKEN_PAUSED":
      return <>Token paused by <AddressLink address={d.by ?? ""} /></>;
    case "TOKEN_UNPAUSED":
      return <>Token unpaused by <AddressLink address={d.by ?? ""} /></>;
    case "WALLET_FROZEN":
      return <>Froze <AddressLink address={d.address ?? d.wallet ?? ""} /></>;
    case "WALLET_UNFROZEN":
      return <>Unfroze <AddressLink address={d.address ?? d.wallet ?? ""} /></>;
    default:
      return event.type;
  }
}

export function IssuerActivityFeed({ events, loading }: { events: AuditEvent[]; loading: boolean }) {
  const recent = [...events].reverse().slice(0, 20);

  return (
    <div className="card-flush">
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        <span className="text-xs text-text-muted font-mono">{events.length} total events</span>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center gap-3 text-text-muted text-sm py-4 justify-center" role="status">
            <Spinner aria-hidden />
            Loading events...
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0.5 max-h-80 overflow-y-auto">
            {recent.map((event) => (
              <div key={event.sequenceNumber} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${EVENT_BADGE_CLASSES[event.type] || "bg-surface-3 text-text-muted"}`}>
                  {event.type}
                </span>
                <span className="text-xs text-text-muted flex-1 truncate">
                  {eventSummary(event)}
                </span>
                <span className="text-[11px] text-text-muted shrink-0">
                  {formatTimestamp(event.consensusTimestamp || event.ts, { includeDate: true })}
                </span>
                {event.tx && (
                  <span className="shrink-0 text-xs">
                    <TxLink hash={event.tx} prefixLen={8} />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
