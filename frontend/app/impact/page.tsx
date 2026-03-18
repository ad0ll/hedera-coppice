"use client";

import { useGuardian } from "@/hooks/use-guardian";
import { formatNumber } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProjectCard } from "@/components/guardian/project-card";
import { SptStatus } from "@/components/guardian/spt-status";
import { AllocationBar } from "@/components/guardian/allocation-bar";

function MetricsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-3 w-20 bg-surface-3 rounded mb-2" />
          <div className="h-8 w-24 bg-surface-3 rounded mb-1" />
          <div className="h-3 w-12 bg-surface-3 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function ImpactPage() {
  const { data, isLoading, error } = useGuardian();

  const metrics = data
    ? [
        {
          label: "tCO\u2082e Verified",
          value: formatNumber(data.totalVerifiedCO2e),
          unit: "tonnes",
        },
        {
          label: "Proceeds Allocated",
          value: `${data.allocationPercent}%`,
          unit: `${formatNumber(data.totalAllocatedEUSD)} eUSD`,
        },
        {
          label: "Projects Funded",
          value: String(data.projects.length),
          unit: "active",
        },
        {
          label: "SPT Status",
          value: data.sptMet ? "Met" : "Below",
          unit: `${formatNumber(data.totalVerifiedCO2e)} / ${formatNumber(data.sptTarget)} tCO₂e`,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <h1
        className="page-title animate-entrance"
        style={{ "--index": 0 } as React.CSSProperties}
      >
        Environmental Impact
      </h1>

      {/* Metrics banner */}
      <div
        className="bg-gradient-to-b from-surface-2 to-transparent full-bleed pb-2 animate-entrance"
        style={{ "--index": 1 } as React.CSSProperties}
      >
        {isLoading ? (
          <MetricsSkeleton />
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 py-6">
            {metrics.map((m) => (
              <div key={m.label}>
                <p className="stat-label mb-1.5">{m.label}</p>
                <p className="font-display text-3xl text-white">
                  <span className="font-mono">{m.value}</span>
                </p>
                <p className="text-xs text-text-muted mt-1">{m.unit}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="card-static border-bond-amber/30 animate-entrance"
          style={{ "--index": 2 } as React.CSSProperties}
        >
          <p className="text-sm text-bond-amber">
            Guardian MRV data unavailable. Showing cached data if available.
          </p>
        </div>
      )}

      {/* SPT + Allocation */}
      {data && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-entrance"
          style={{ "--index": 2 } as React.CSSProperties}
        >
          <SptStatus
            totalVerified={data.totalVerifiedCO2e}
            target={data.sptTarget}
            met={data.sptMet}
          />
          <AllocationBar
            allocated={data.totalAllocatedEUSD}
            total={data.totalIssuanceEUSD}
            percent={data.allocationPercent}
            projects={data.projects}
          />
        </div>
      )}

      {/* Project Portfolio */}
      <section
        className="animate-entrance"
        style={{ "--index": 3 } as React.CSSProperties}
      >
        <h2 className="card-title">Project Portfolio</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-static animate-pulse h-32" />
            ))}
          </div>
        ) : data && data.projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.projects.map((p) => (
              <ProjectCard key={p.registration.ProjectName} project={p} />
            ))}
          </div>
        ) : (
          <div className="card-static text-sm text-text-muted">
            No projects registered yet.
          </div>
        )}
      </section>

      {/* ICMA Compliance Evidence */}
      {data && data.bondFramework && (
        <section className="animate-entrance" style={{ "--index": 4 } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title mb-0">ICMA Compliance Evidence</h2>
            <StatusBadge label="Guardian Verified" variant="green" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Use of Proceeds */}
            <div className="card-static">
              <p className="stat-label mb-2">Use of Proceeds</p>
              <p className="text-sm text-white mb-1">{data.bondFramework.EligibleICMACategories}</p>
              <p className="text-xs text-text-muted">
                {data.allocationPercent}% allocated ({formatNumber(data.totalAllocatedEUSD)} / {formatNumber(data.totalIssuanceEUSD)} eUSD) across {data.projects.length} projects
              </p>
            </div>

            {/* Project Evaluation & Selection */}
            <div className="card-static">
              <p className="stat-label mb-2">Project Evaluation</p>
              <p className="text-sm text-white mb-1">
                {data.projects.filter(p => p.isVerified).length} of {data.projects.length} projects independently verified
              </p>
              <p className="text-xs text-text-muted">
                External review: {data.bondFramework.ExternalReviewProvider ?? "Not specified"}
              </p>
            </div>

            {/* Management of Proceeds */}
            <div className="card-static">
              <p className="stat-label mb-2">Management of Proceeds</p>
              <p className="text-sm text-white mb-1">On-chain treasury with smart contract controls</p>
              <div className="flex gap-3 mt-1">
                <a href={`https://hashscan.io/testnet/contract/${data.bondFramework.BondContractAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-bond-green hover:text-bond-green/80">Bond Contract</a>
                <a href={`https://hashscan.io/testnet/contract/${data.bondFramework.LCCFContractAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-bond-green hover:text-bond-green/80">Payout Contract</a>
              </div>
            </div>

            {/* Reporting */}
            <div className="card-static">
              <p className="stat-label mb-2">Reporting &amp; Frameworks</p>
              <p className="text-sm text-white mb-1">{data.bondFramework.ReportingStandard}</p>
              {data.bondFramework.RegulatoryFrameworks && (
                <p className="text-xs text-text-muted">{data.bondFramework.RegulatoryFrameworks}</p>
              )}
              {data.bondFramework.EUTaxonomyAlignmentPercent != null && (
                <p className="text-xs text-text-muted mt-1">EU Taxonomy alignment: {data.bondFramework.EUTaxonomyAlignmentPercent}%</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
