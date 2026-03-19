"use client";

import { useMemo } from "react";
import { useGuardian } from "@/hooks/use-guardian";
import { formatNumber } from "@/lib/format";
import type { GuardianProject, VCEvidence } from "@/lib/guardian-types";

function hashScanUrl(_topicId: string, messageId: string): string {
  return `https://hashscan.io/testnet/transaction/${messageId}`;
}

function ipfsUrl(hash: string): string {
  return `/api/guardian/ipfs/${hash}`;
}

function abbreviateDid(did: string): string {
  const parts = did.split("_");
  const accountId = parts.length > 1 ? parts[parts.length - 1] : "";
  return accountId ? `did:hedera:...${accountId}` : did.slice(0, 20) + "...";
}

interface TimelineEvent {
  type: "registration" | "allocation" | "mrv" | "verification";
  projectName: string;
  date: string;
  evidence: VCEvidence;
  detail: string;
}

function buildTimeline(projects: GuardianProject[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const p of projects) {
    if (p.registrationEvidence) {
      events.push({
        type: "registration",
        projectName: p.registration.ProjectName,
        date: p.registrationEvidence.issuanceDate,
        evidence: p.registrationEvidence,
        detail: `${p.registration.ICMACategory} - ${p.registration.Location}`,
      });
    }
    if (p.allocation && p.allocationEvidence) {
      events.push({
        type: "allocation",
        projectName: p.allocation.ProjectName,
        date: p.allocationEvidence.issuanceDate,
        evidence: p.allocationEvidence,
        detail: `${formatNumber(p.allocation.AllocatedAmountEUSD)} eUSD - ${p.allocation.Purpose}`,
      });
    }
    if (p.mrvReport && p.mrvEvidence) {
      events.push({
        type: "mrv",
        projectName: p.mrvReport.ProjectName,
        date: p.mrvEvidence.issuanceDate,
        evidence: p.mrvEvidence,
        detail: `${formatNumber(p.mrvReport.AnnualGHGReduced)} tCO\u2082e reported (${p.mrvReport.ReportingPeriodStart} to ${p.mrvReport.ReportingPeriodEnd})`,
      });
    }
    if (p.verification && p.verificationEvidence) {
      events.push({
        type: "verification",
        projectName: p.verification.ProjectName,
        date: p.verificationEvidence.issuanceDate,
        evidence: p.verificationEvidence,
        detail: `${p.verification.Opinion} - ${formatNumber(p.verification.VerifiedGHGReduced)} tCO\u2082e verified`,
      });
    }
  }
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const TYPE_LABELS: Record<TimelineEvent["type"], string> = {
  registration: "Project Registered",
  allocation: "Funds Allocated",
  mrv: "MRV Report Submitted",
  verification: "Verification Complete",
};

const TYPE_COLORS: Record<TimelineEvent["type"], string> = {
  registration: "bg-bond-teal/15 text-bond-teal",
  allocation: "bg-bond-amber/15 text-bond-amber",
  mrv: "bg-bond-teal/15 text-bond-teal",
  verification: "bg-bond-green/15 text-bond-green",
};

export function GuardianEvents() {
  const { data, isLoading, error } = useGuardian();
  const timeline = useMemo(
    () => (data ? buildTimeline(data.projects) : []),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-static animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-static border-bond-amber/30">
        <p className="text-sm text-bond-amber">
          Guardian MRV data unavailable. Showing cached data if available.
        </p>
      </div>
    );
  }

  if (!data || timeline.length === 0) {
    return (
      <div className="card-static text-sm text-text-muted text-center py-8">
        No Guardian verification events yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {timeline.map((event, i) => (
        <div key={i} className="card-static">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${TYPE_COLORS[event.type]}`}>
                  {TYPE_LABELS[event.type]}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(event.date).toLocaleString("en-US", {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-text font-medium">{event.projectName}</p>
              <p className="text-xs text-text-muted mt-0.5">{event.detail}</p>
              <p className="text-[11px] sm:text-xs text-text-muted mt-1 font-mono">
                Signed by {abbreviateDid(event.evidence.issuer)}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <a href={ipfsUrl(event.evidence.hash)} target="_blank" rel="noopener noreferrer"
                className="text-[11px] sm:text-xs text-bond-green hover:text-bond-green/80 transition-colors px-1.5 py-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center">IPFS</a>
              <a href={hashScanUrl(event.evidence.topicId, event.evidence.messageId)} target="_blank" rel="noopener noreferrer"
                className="text-[11px] sm:text-xs text-bond-green hover:text-bond-green/80 transition-colors px-1.5 py-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center">HashScan</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
