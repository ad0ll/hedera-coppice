"use client";

import { useState } from "react";
import { AuditEventFeed } from "@/components/audit-event-feed";
import { GuardianEvents } from "@/components/guardian/guardian-events";
import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { APPROVAL_EVENTS, RESTRICTION_EVENTS } from "@/lib/event-types";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { useCoupons } from "@/hooks/use-coupons";

export default function ComplianceMonitor() {
  const { events } = useHCSAudit("audit");
  const { data: coupons } = useCoupons();
  const [tab, setTab] = useState<"onchain" | "guardian">("onchain");

  const approvals = events.filter((e) => APPROVAL_EVENTS.has(e.type)).length;
  const restrictions = events.filter((e) => RESTRICTION_EVENTS.has(e.type)).length;

  return (
    <div className="space-y-6">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>Compliance Monitor</h1>

      <div className="bg-surface-2 border-y border-border full-bleed animate-entrance" style={{ "--index": 1 } as React.CSSProperties}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="py-4 sm:py-6 sm:pr-6">
            <p className="stat-label mb-2">Total Events</p>
            <p className="font-display text-3xl sm:text-5xl text-white">{events.length}</p>
          </div>
          <div className="py-4 sm:py-6 sm:px-6">
            <p className="stat-label mb-2">Approvals</p>
            <p className="font-display text-3xl sm:text-5xl text-bond-green">{approvals}</p>
          </div>
          <div className="py-4 sm:py-6 sm:pl-6">
            <p className="stat-label mb-2">Restrictions</p>
            <p className="font-display text-3xl sm:text-5xl text-bond-red">{restrictions}</p>
          </div>
        </div>
      </div>

      {/* Coupon Activity */}
      {coupons && coupons.length > 0 && (
        <section className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
          <h2 className="card-title">Coupon Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((c) => (
              <div key={c.id} className="card-static text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">Coupon #{c.id}</span>
                  <span className={`px-2 py-0.5 rounded font-medium ${
                    c.status === "paid" ? "bg-bond-green/15 text-bond-green" :
                    c.status === "executable" ? "bg-bond-green/15 text-bond-green" :
                    "bg-bond-amber/15 text-bond-amber"
                  }`}>
                    {c.status === "paid" ? "Distributed" : c.status === "executable" ? "Ready" : c.status === "record" ? "Record" : "Upcoming"}
                  </span>
                </div>
                <div className="space-y-1 text-text-muted">
                  <div className="flex justify-between">
                    <span>Rate</span>
                    <span className="font-mono text-white">{c.rateDisplay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period</span>
                    <span className="font-mono text-white">{c.periodDays}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record</span>
                    <span className="font-mono text-white">
                      {new Date(c.recordDate * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record Status</span>
                    <span className={`font-mono ${c.snapshotId > 0 ? "text-bond-green" : "text-text-muted"}`}>
                      {c.snapshotId > 0 ? "Captured" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab toggle */}
      <div role="tablist" aria-label="Event source" className="flex gap-1 bg-surface-2 rounded-lg p-1 w-fit animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
        <button
          role="tab"
          aria-selected={tab === "onchain"}
          aria-controls="panel-onchain"
          onClick={() => setTab("onchain")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "onchain" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
          }`}
        >
          On-Chain Events
        </button>
        <button
          role="tab"
          aria-selected={tab === "guardian"}
          aria-controls="panel-guardian"
          onClick={() => setTab("guardian")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "guardian" ? "bg-surface-3 text-white font-medium" : "text-text-muted hover:text-white"
          }`}
        >
          Guardian Verification
        </button>
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-label={tab === "onchain" ? "On-Chain Events" : "Guardian Verification"} className="animate-entrance" style={{ "--index": 4 } as React.CSSProperties}>
        <SectionErrorBoundary section="event feed">
          {tab === "onchain" ? (
            <AuditEventFeed topicType="audit" />
          ) : (
            <GuardianEvents />
          )}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
