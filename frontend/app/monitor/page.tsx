"use client";

import { AuditEventFeed } from "@/components/audit-event-feed";
import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { APPROVAL_EVENTS, RESTRICTION_EVENTS } from "@/lib/event-types";

export default function ComplianceMonitor() {
  const { events } = useHCSAudit("audit");

  const approvals = events.filter((e) => APPROVAL_EVENTS.has(e.type)).length;
  const restrictions = events.filter((e) => RESTRICTION_EVENTS.has(e.type)).length;

  return (
    <div className="space-y-6">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>Compliance Monitor</h1>

      <div className="bg-surface-2 border-y border-border full-bleed animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
        <div className="max-w-7xl mx-auto flex divide-x divide-border">
          <div className="flex-1 py-6 pr-6">
            <p className="stat-label mb-2">Total Events</p>
            <p className="font-display text-5xl text-white">{events.length}</p>
          </div>
          <div className="flex-1 py-6 px-6">
            <p className="stat-label mb-2">Approvals</p>
            <p className="font-display text-5xl text-bond-green">{approvals}</p>
          </div>
          <div className="flex-1 py-6 pl-6">
            <p className="stat-label mb-2">Restrictions</p>
            <p className="font-display text-5xl text-bond-red">{restrictions}</p>
          </div>
        </div>
      </div>

      <div className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
        <AuditEventFeed topicType="audit" />
      </div>
    </div>
  );
}
