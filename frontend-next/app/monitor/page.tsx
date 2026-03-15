"use client";

import { AuditEventFeed } from "@/components/audit-event-feed";
import { useHCSAudit } from "@/hooks/use-hcs-audit";

export default function ComplianceMonitor() {
  const { events } = useHCSAudit("audit");

  const approvals = events.filter((e) => ["TRANSFER", "MINT", "TOKEN_UNPAUSED", "WALLET_UNFROZEN"].includes(e.type)).length;
  const restrictions = events.filter((e) => ["TOKEN_PAUSED", "WALLET_FROZEN"].includes(e.type)).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Compliance Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-2 border border-border rounded-xl p-5 card-glow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-text-muted uppercase tracking-widest">Total Events</p>
            <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center">
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-mono font-semibold text-white">{events.length}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-5 card-glow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-text-muted uppercase tracking-widest">Approvals</p>
            <div className="w-8 h-8 rounded-lg bg-bond-green/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-bond-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-mono font-semibold text-bond-green">{approvals}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-5 card-glow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-text-muted uppercase tracking-widest">Restrictions</p>
            <div className="w-8 h-8 rounded-lg bg-bond-red/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-mono font-semibold text-bond-red">{restrictions}</p>
        </div>
      </div>

      <AuditEventFeed topicType="audit" />
    </div>
  );
}
