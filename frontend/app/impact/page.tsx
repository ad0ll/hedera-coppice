import { StatusBadge } from "@/components/ui/status-badge";

const METRICS = [
  { label: "tCO\u2082e Avoided", value: "12,450", unit: "tonnes" },
  { label: "Clean Energy Generated", value: "28.4", unit: "GWh" },
  { label: "Renewable Capacity", value: "15.2", unit: "MW" },
  { label: "Projects Funded", value: "7", unit: "active" },
];

const PROJECTS = [
  {
    name: "Sunridge Solar Farm",
    category: "Solar",
    location: "Nairobi, Kenya",
    capacity: "50 MW",
    status: "Operational" as const,
  },
  {
    name: "Baltic Wind Park",
    category: "Wind",
    location: "Tallinn, Estonia",
    capacity: "120 MW",
    status: "Under Construction" as const,
  },
  {
    name: "GridStore Alpha",
    category: "Energy Storage",
    location: "Singapore",
    capacity: "25 MWh",
    status: "Operational" as const,
  },
  {
    name: "Andean Hydro",
    category: "Hydroelectric",
    location: "Cusco, Peru",
    capacity: "30 MW",
    status: "Planning" as const,
  },
];

const STATUS_VARIANT: Record<string, "green" | "amber"> = {
  Operational: "green",
  "Under Construction": "amber",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  Solar: "bg-bond-green/15 text-bond-green",
  Wind: "bg-bond-teal/15 text-bond-teal",
  "Energy Storage": "bg-bond-amber/15 text-bond-amber",
  Hydroelectric: "bg-blue-500/15 text-blue-400",
};

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

export default function ImpactPage() {
  return (
    <div className="space-y-8">
      <h1 className="page-title animate-entrance" style={{ "--index": 0 } as React.CSSProperties}>
        Environmental Impact
      </h1>

      {/* Metrics banner */}
      <div
        className="bg-gradient-to-b from-surface-2 to-transparent full-bleed pb-2 animate-entrance"
        style={{ "--index": 1 } as React.CSSProperties}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 py-6">
          {METRICS.map((m) => (
            <div key={m.label}>
              <p className="stat-label mb-1.5">{m.label}</p>
              <p className="font-display text-3xl text-white">
                <span className="font-mono">{m.value}</span>
              </p>
              <p className="text-xs text-text-muted mt-1">{m.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Project Portfolio */}
      <section className="animate-entrance" style={{ "--index": 2 } as React.CSSProperties}>
        <h2 className="card-title">Project Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROJECTS.map((p) => (
            <div key={p.name} className="card-static flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                {STATUS_VARIANT[p.status] ? (
                  <StatusBadge label={p.status} variant={STATUS_VARIANT[p.status]} />
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border bg-blue-500/15 text-blue-400 border-blue-400/20">
                    {p.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_BADGE_COLORS[p.category] ?? "bg-surface-3 text-text-muted"}`}
                >
                  {p.category}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{p.location}</span>
                <span className="font-mono text-white">{p.capacity}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ICMA Green Bond Principles */}
      <section className="animate-entrance" style={{ "--index": 3 } as React.CSSProperties}>
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
                <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Source — Guardian MRV */}
      <div className="animate-entrance" style={{ "--index": 4 } as React.CSSProperties}>
        <div className="card-static">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Real-Time MRV Integration</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border bg-bond-teal/15 text-bond-teal border-bond-teal/20">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Environmental data will be verified through Hedera Guardian&#39;s MRV (Measurement,
            Reporting, and Verification) framework, providing tamper-proof sustainability credentials
            linked to each funded project.
          </p>
        </div>
      </div>
    </div>
  );
}
