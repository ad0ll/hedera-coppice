"use client";

import { useGuardian } from "@/hooks/use-guardian";
import type { GuardianProject, VCEvidence } from "@/lib/guardian-types";

function hashScanUrl(topicId: string, messageId: string): string {
  return `https://hashscan.io/testnet/topic/${topicId}/message/${messageId}`;
}

function ipfsUrl(hash: string): string {
  return `https://ipfs.io/ipfs/${hash}`;
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
        detail: `${p.allocation.AllocatedAmountEUSD.toLocaleString()} eUSD - ${p.allocation.Purpose}`,
      });
    }
    if (p.mrvReport && p.mrvEvidence) {
      events.push({
        type: "mrv",
        projectName: p.mrvReport.ProjectName,
        date: p.mrvEvidence.issuanceDate,
        evidence: p.mrvEvidence,
        detail: `${p.mrvReport.AnnualGHGReduced.toLocaleString()} tCO\u2082e reported (${p.mrvReport.ReportingPeriodStart} to ${p.mrvReport.ReportingPeriodEnd})`,
      });
    }
    if (p.verification && p.verificationEvidence) {
      events.push({
        type: "verification",
        projectName: p.verification.ProjectName,
        date: p.verificationEvidence.issuanceDate,
        evidence: p.verificationEvidence,
        detail: `${p.verification.Opinion} - ${p.verification.VerifiedGHGReduced.toLocaleString()} tCO\u2082e verified`,
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
  mrv: "bg-blue-500/15 text-blue-400",
  verification: "bg-bond-green/15 text-bond-green",
};

export function GuardianEvents() {
  const { data, isLoading } = useGuardian();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-static animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (!data || data.projects.length === 0) {
    return (
      <div className="card-static text-sm text-text-muted text-center py-8">
        No Guardian verification events yet.
      </div>
    );
  }

  const timeline = buildTimeline(data.projects);

  return (
    <div className="space-y-3">
      {timeline.map((event, i) => (
        <div key={i} className="card-static">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${TYPE_COLORS[event.type]}`}>
                  {TYPE_LABELS[event.type]}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(event.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white font-medium">{event.projectName}</p>
              <p className="text-xs text-text-muted mt-0.5">{event.detail}</p>
              <p className="text-[10px] text-text-muted/60 mt-1 font-mono">
                Signed by {abbreviateDid(event.evidence.issuer)}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <a href={ipfsUrl(event.evidence.hash)} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">IPFS</a>
              <a href={hashScanUrl(event.evidence.topicId, event.evidence.messageId)} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-bond-green hover:text-bond-green/80 transition-colors">HashScan</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
