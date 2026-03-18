import { StatusBadge } from "@/components/ui/status-badge";
import type { GuardianProject } from "@/lib/guardian-types";

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

export function ProjectCard({ project }: { project: GuardianProject }) {
  const reg = project.registration;

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
    </div>
  );
}
