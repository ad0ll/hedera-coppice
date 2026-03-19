"use client";

import { useState } from "react";
import { AuditEventFeed } from "@/components/audit-event-feed";
import { GuardianEvents } from "@/components/guardian/guardian-events";
import { useHCSAudit } from "@/hooks/use-hcs-audit";
import { APPROVAL_EVENTS, RESTRICTION_EVENTS, COUPON_STATUS_VARIANT, COUPON_STATUS_LABEL } from "@/lib/event-types";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionErrorBoundary } from "@/components/section-error-boundary";
import { useCoupons } from "@/hooks/use-coupons";
import { entranceProps } from "@/lib/animation";

export default function ComplianceMonitor() {
  const { events } = useHCSAudit("audit");
  const { data: coupons } = useCoupons();
  const [tab, setTab] = useState<"onchain" | "guardian">("onchain");

  const approvals = events.filter((e) => APPROVAL_EVENTS.has(e.type)).length;
  const restrictions = events.filter((e) => RESTRICTION_EVENTS.has(e.type)).length;

  return (
    <div className="space-y-6">
      <h1 {...entranceProps(0, "page-title")}>Compliance Monitor</h1>

      <div {...entranceProps(1, "bg-surface-2 border-y border-border full-bleed")}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="py-5 sm:py-6 sm:pr-6">
            <p className="stat-label mb-2">Total Events</p>
            <p className="font-display text-3xl sm:text-4xl lg:text-5xl text-text">{events.length}</p>
          </div>
          <div className="py-5 sm:py-6 sm:px-6">
            <p className="stat-label mb-2">Approvals</p>
            <p className="font-display text-3xl sm:text-5xl text-bond-green">{approvals}</p>
          </div>
          <div className="py-5 sm:py-6 sm:pl-6">
            <p className="stat-label mb-2">Restrictions</p>
            <p className="font-display text-3xl sm:text-5xl text-bond-red">{restrictions}</p>
          </div>
        </div>
      </div>

      {/* Coupon Activity */}
      {coupons && coupons.length > 0 && (
        <section {...entranceProps(2)}>
          <h2 className="card-title">Coupon Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coupons.map((c) => (
              <div key={c.id} className="card-static text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text text-sm">Coupon #{c.id}</span>
                  <StatusBadge
                    label={COUPON_STATUS_LABEL[c.status] ?? c.status}
                    variant={COUPON_STATUS_VARIANT[c.status] ?? "amber"}
                  />
                </div>
                <div className="space-y-1 text-text-muted">
                  <div className="flex justify-between">
                    <span>Rate</span>
                    <span className="font-mono text-text">{c.rateDisplay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period</span>
                    <span className="font-mono text-text">{c.periodDays}d</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Record</span>
                    <span className="font-mono text-text">
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
      <div role="tablist" aria-label="Event source" {...entranceProps(3, "flex gap-1 bg-surface-2 rounded-lg p-1 w-fit")}>
        <button
          id="tab-onchain"
          role="tab"
          aria-selected={tab === "onchain"}
          aria-controls="panel-onchain"
          onClick={() => setTab("onchain")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "onchain" ? "bg-surface-3 text-text font-medium" : "text-text-muted hover:text-text"
          }`}
        >
          On-Chain Events
        </button>
        <button
          id="tab-guardian"
          role="tab"
          aria-selected={tab === "guardian"}
          aria-controls="panel-guardian"
          onClick={() => setTab("guardian")}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${
            tab === "guardian" ? "bg-surface-3 text-text font-medium" : "text-text-muted hover:text-text"
          }`}
        >
          Guardian Verification
        </button>
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} {...entranceProps(4)}>
        <div key={tab} className="animate-tab-enter">
          <SectionErrorBoundary section="event feed">
            {tab === "onchain" ? (
              <AuditEventFeed topicType="audit" />
            ) : (
              <GuardianEvents />
            )}
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  );
}
