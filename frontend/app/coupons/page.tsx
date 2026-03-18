"use client";

import { useMemo } from "react";
import { useCoupons } from "@/hooks/use-coupons";
import type { CouponInfo } from "@/hooks/use-coupons";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { CPC_SECURITY_ID } from "@/lib/constants";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_VARIANT: Record<CouponInfo["status"], "green" | "amber"> = {
  paid: "green",
  executable: "green",
  record: "amber",
  upcoming: "amber",
};

const STATUS_LABEL: Record<CouponInfo["status"], string> = {
  paid: "Paid",
  executable: "Executable",
  record: "Record Date Passed",
  upcoming: "Upcoming",
};

function getNextCouponDate(coupons: CouponInfo[]): string {
  const now = Math.floor(Date.now() / 1000);
  const upcoming = coupons
    .filter((c) => c.recordDate > now)
    .sort((a, b) => a.recordDate - b.recordDate);
  if (upcoming.length > 0) {
    return formatDate(upcoming[0].recordDate);
  }
  return "None scheduled";
}

export default function CouponsPage() {
  const { data: coupons, isLoading, isError } = useCoupons();
  const couponList = useMemo(() => coupons ?? [], [coupons]);
  const nextCouponDate = useMemo(() => getNextCouponDate(couponList), [couponList]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1
          className="page-title animate-entrance"
          style={{ "--index": 0 } as React.CSSProperties}
        >
          Coupon Schedule
        </h1>
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-6 h-6" aria-label="Loading coupon data" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <h1
          className="page-title animate-entrance"
          style={{ "--index": 0 } as React.CSSProperties}
        >
          Coupon Schedule
        </h1>
        <EmptyState
          icon={
            <svg
              aria-hidden="true"
              className="w-6 h-6 text-bond-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          }
          title="Failed to load coupons"
          description="Could not fetch coupon data from the bond contract. Please try again later."
          variant="danger"
        />
      </div>
    );
  }

  if (couponList.length === 0) {
    return (
      <div className="space-y-8">
        <h1
          className="page-title animate-entrance"
          style={{ "--index": 0 } as React.CSSProperties}
        >
          Coupon Schedule
        </h1>
        <EmptyState
          icon={
            <svg
              aria-hidden="true"
              className="w-6 h-6 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          }
          title="No coupons scheduled"
          description="No coupon periods have been configured for the Coppice Green Bond yet. Check back after the issuer sets the coupon schedule."
        />
      </div>
    );
  }

  const latestRate = couponList[couponList.length - 1].rateDisplay;

  return (
    <div className="space-y-8">
      <h1
        className="page-title animate-entrance"
        style={{ "--index": 0 } as React.CSSProperties}
      >
        Coupon Schedule
      </h1>

      {/* Summary Banner */}
      <div
        className="bg-gradient-to-b from-surface-2 to-transparent full-bleed pb-2 animate-entrance"
        style={{ "--index": 1 } as React.CSSProperties}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 py-6">
          <div>
            <p className="stat-label mb-1.5">Next Coupon</p>
            <p className="font-display text-3xl text-white">
              <span className="font-mono text-2xl">{nextCouponDate}</span>
            </p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Annual Rate</p>
            <p className="font-display text-3xl text-white">
              <span className="font-mono">{latestRate}</span>
            </p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Total Coupons</p>
            <p className="font-display text-3xl text-white">
              <span className="font-mono">{couponList.length}</span>
            </p>
          </div>
          <div>
            <p className="stat-label mb-1.5">Face Value</p>
            <p className="font-display text-3xl text-white">
              <span className="font-mono">$1,000</span>
            </p>
            <p className="text-xs text-text-muted mt-1">eUSD per bond</p>
          </div>
        </div>
      </div>

      {/* Coupon Periods */}
      <section
        className="animate-entrance"
        style={{ "--index": 2 } as React.CSSProperties}
      >
        <h2 className="card-title">Coupon Periods</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {couponList.map((coupon, idx) => (
            <div
              key={coupon.id}
              className="card-static flex flex-col gap-3 animate-entrance"
              style={{ "--index": idx + 3 } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Coupon #{coupon.id}
                </h3>
                <StatusBadge
                  label={STATUS_LABEL[coupon.status]}
                  variant={STATUS_VARIANT[coupon.status]}
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted">
                  {formatDate(coupon.startDate)} &mdash;{" "}
                  {formatDate(coupon.endDate)}
                </span>
                <span className="bg-surface-3 text-text-muted px-2 py-0.5 rounded font-medium">
                  {coupon.periodDays} days
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/5">
                <div>
                  <p className="stat-label mb-1">Rate</p>
                  <p className="font-mono text-sm text-white">
                    {coupon.rateDisplay}
                  </p>
                </div>
                <div>
                  <p className="stat-label mb-1">Snapshot ID</p>
                  <p className="font-mono text-sm text-white">
                    {coupon.snapshotId > 0 ? coupon.snapshotId : "--"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/5">
                <div>
                  <p className="stat-label mb-1">Record Date</p>
                  <p className="font-mono text-xs text-text-muted">
                    {formatDate(coupon.recordDate)}
                  </p>
                </div>
                <div>
                  <p className="stat-label mb-1">Execution Date</p>
                  <p className="font-mono text-xs text-text-muted">
                    {formatDate(coupon.executionDate)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bond Info Footer */}
      <div
        className="animate-entrance"
        style={{ "--index": couponList.length + 3 } as React.CSSProperties}
      >
        <div className="card-static">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Coppice Green Bond (CPC)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border bg-bond-green/15 text-bond-green border-bond-green/20">
              Active
            </span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Fixed-rate green bond with semi-annual coupon payments denominated in
            eUSD. Coupon distributions are executed on-chain via the
            LifeCycleCashFlow contract, using ATS snapshots to determine holder
            balances at the record date.
          </p>
          <a
            href={`https://hashscan.io/testnet/contract/${CPC_SECURITY_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-bond-green hover:text-bond-green/80 transition-colors mt-3"
          >
            View bond contract on HashScan
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
}
