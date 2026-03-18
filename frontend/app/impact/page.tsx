"use client";

import { useGuardian } from "@/hooks/use-guardian";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProjectCard } from "@/components/guardian/project-card";
import { SptStatus } from "@/components/guardian/spt-status";
import { AllocationBar } from "@/components/guardian/allocation-bar";

const ICMA_PRINCIPLES = [
  {
    title: "Use of Proceeds",
    description: "100% allocated to eligible green projects",
  },
  {
    title: "Project Evaluation & Selection",
    description: "Independent ESG review committee",
  },
  {
    title: "Management of Proceeds",
    description: "Segregated account with quarterly audits",
  },
  {
    title: "Reporting",
    description: "Annual impact report with third-party verification",
  },
];

function MetricsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 py-6">
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
          value: data.totalVerifiedCO2e.toLocaleString(),
          unit: "tonnes",
        },
        {
          label: "Proceeds Allocated",
          value: `${data.allocationPercent}%`,
          unit: `${data.totalAllocatedEUSD.toLocaleString()} eUSD`,
        },
        {
          label: "Projects Funded",
          value: String(data.projects.length),
          unit: "active",
        },
        {
          label: "SPT Status",
          value: data.sptMet ? "Met" : "Below",
          unit: `${data.totalVerifiedCO2e.toLocaleString()} / ${data.sptTarget.toLocaleString()} tCO₂e`,
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
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 py-6">
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

      {/* ICMA Green Bond Principles */}
      <section
        className="animate-entrance"
        style={{ "--index": 4 } as React.CSSProperties}
      >
        <h2 className="card-title">ICMA Green Bond Principles</h2>
        <div className="card-static space-y-4">
          {ICMA_PRINCIPLES.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-bond-green shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Source */}
      <div
        className="animate-entrance"
        style={{ "--index": 5 } as React.CSSProperties}
      >
        <div className="card-static">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">
              Guardian MRV Integration
            </h2>
            <StatusBadge
              label={data ? "Live" : "Connecting"}
              variant={data ? "green" : "amber"}
            />
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Environmental data is verified through Hedera Guardian&apos;s MRV
            (Measurement, Reporting, and Verification) framework. Each project&apos;s
            impact claims are independently verified and recorded as Verifiable
            Credentials on Hedera, providing tamper-proof sustainability evidence.
          </p>
        </div>
      </div>
    </div>
  );
}
