"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { VCEvidenceRow } from "@/components/guardian/vc-evidence";
import type { GuardianProject, Indicator } from "@/lib/guardian-types";

function downloadJson(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  "Renewable Energy": "bg-bond-green/15 text-bond-green",
  "Sustainable Water Management": "bg-bond-teal/15 text-bond-teal",
  "Energy Efficiency": "bg-bond-amber/15 text-bond-amber",
};

function getVerificationStatus(project: GuardianProject) {
  if (project.verification) {
    if (project.verification.Opinion === "Approved") return "Verified";
    if (project.verification.Opinion === "Conditional") return "Conditional";
    return "Rejected";
  }
  return project.mrvReport ? "Pending Review" : "Awaiting MRV";
}

function getStatusVariant(project: GuardianProject): "green" | "red" | "amber" {
  if (project.isVerified) return "green";
  if (project.verification?.Opinion === "Rejected") return "red";
  return "amber";
}

function renderIndicators(json: string, label: string) {
  try {
    const indicators: Indicator[] = JSON.parse(json);
    return (
      <div className="mt-1">
        <span className="text-text-muted/60 text-xs">{label}: </span>
        {indicators.map((ind, i) => (
          <span key={i} className="text-xs">
            {i > 0 && " | "}
            <span className="font-mono text-white/70">{ind.value.toLocaleString()}</span> {ind.unit}
          </span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

export function ProjectCard({ project }: { project: GuardianProject }) {
  const reg = project.registration;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-static flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{reg.ProjectName}</h3>
        <StatusBadge
          label={getVerificationStatus(project)}
          variant={getStatusVariant(project)}
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_BADGE_COLORS[reg.ICMACategory] ?? "bg-surface-3 text-text-muted"}`}
        >
          {reg.SubCategory}
        </span>
        {project.verification && (
          <span className="text-xs px-2 py-0.5 rounded font-medium bg-bond-green/10 text-bond-green">
            Guardian Verified
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{reg.Location}</span>
        <span className="font-mono text-white">
          {reg.Capacity.toLocaleString()} {reg.CapacityUnit}
        </span>
      </div>
      {project.verification && (
        <div className="flex items-center justify-between text-xs border-t border-surface-3 pt-2 mt-1">
          <span className="text-text-muted">Verified CO₂e Avoided</span>
          <span className="font-mono text-bond-green">
            {project.verifiedCO2e.toLocaleString()} t
          </span>
        </div>
      )}
      {project.allocation && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Allocated</span>
          <span className="font-mono text-white">
            {project.allocation.AllocatedAmountEUSD.toLocaleString()} eUSD
          </span>
        </div>
      )}

      {/* Evidence toggle */}
      {(project.registrationEvidence || project.allocationEvidence || project.mrvEvidence || project.verificationEvidence) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left text-xs text-text-muted hover:text-white transition-colors pt-3 mt-3 border-t border-border/30 flex items-center gap-1"
          >
            <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
            {expanded ? "Hide Evidence" : "View Evidence Chain"}
          </button>

          {expanded && (
            <div className="mt-3 pt-1">
              {project.registrationEvidence && (
                <VCEvidenceRow label="Registration" evidence={project.registrationEvidence}>
                  {project.registration.EUTaxonomyActivityID && (
                    <p><span className="text-text-muted/60">EU Taxonomy: </span>{project.registration.EUTaxonomyActivityID} ({project.registration.TaxonomyAlignmentStatus ?? "unknown"})</p>
                  )}
                </VCEvidenceRow>
              )}
              {project.allocationEvidence && project.allocation && (
                <VCEvidenceRow label="Allocation" evidence={project.allocationEvidence}>
                  <p><span className="text-text-muted/60">Amount: </span>{project.allocation.AllocatedAmountEUSD.toLocaleString()} eUSD</p>
                  <p><span className="text-text-muted/60">Purpose: </span>{project.allocation.Purpose}</p>
                  {project.allocation.HederaTransactionID && (
                    <p><span className="text-text-muted/60">Hedera Tx: </span>
                      <a href={`https://hashscan.io/testnet/transaction/${project.allocation.HederaTransactionID}`}
                        target="_blank" rel="noopener noreferrer" className="font-mono text-bond-green hover:text-bond-green/80">
                        {project.allocation.HederaTransactionID.slice(0, 30)}...
                      </a>
                    </p>
                  )}
                </VCEvidenceRow>
              )}
              {project.mrvEvidence && project.mrvReport && (
                <VCEvidenceRow label="MRV Report" evidence={project.mrvEvidence}>
                  <p><span className="text-text-muted/60">Period: </span>{project.mrvReport.ReportingPeriodStart} to {project.mrvReport.ReportingPeriodEnd}</p>
                  <p><span className="text-text-muted/60">Methodology: </span>{project.mrvReport.Methodology}</p>
                  <p><span className="text-text-muted/60">Standard: </span>{project.mrvReport.ReportingStandard}</p>
                  {renderIndicators(project.mrvReport.CoreIndicatorsJSON, "Core")}
                  {project.mrvReport.AdditionalIndicatorsJSON && renderIndicators(project.mrvReport.AdditionalIndicatorsJSON, "Additional")}
                </VCEvidenceRow>
              )}
              {project.verificationEvidence && project.verification && (
                <VCEvidenceRow label="Verification" evidence={project.verificationEvidence}>
                  <p><span className="text-text-muted/60">Opinion: </span>
                    <span className={project.verification.Opinion === "Approved" ? "text-bond-green" : "text-bond-amber"}>
                      {project.verification.Opinion}
                    </span>
                  </p>
                  <p><span className="text-text-muted/60">Verified: </span>{project.verification.VerifiedGHGReduced.toLocaleString()} tCO&#x2082;e</p>
                  {project.verification.VerifierNotes && (
                    <p className="italic text-text-muted/80 mt-1">&ldquo;{project.verification.VerifierNotes}&rdquo;</p>
                  )}
                </VCEvidenceRow>
              )}
              {(project.registrationDocument || project.allocationDocument || project.mrvDocument || project.verificationDocument) && (
                <button
                  onClick={() => {
                    const evidence: Record<string, unknown> = {};
                    if (project.registrationDocument) evidence.registration = project.registrationDocument;
                    if (project.allocationDocument) evidence.allocation = project.allocationDocument;
                    if (project.mrvDocument) evidence.mrv = project.mrvDocument;
                    if (project.verificationDocument) evidence.verification = project.verificationDocument;
                    downloadJson(evidence, `${project.registration.ProjectName.replace(/\s+/g, "-").toLowerCase()}-evidence.json`);
                  }}
                  className="w-full text-center text-xs text-text-muted hover:text-white transition-colors py-2 mt-2 border-t border-border/30"
                >
                  Download Evidence Chain (JSON)
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
