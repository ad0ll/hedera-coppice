import { AuditEventFeed } from "../components/AuditEventFeed";
import { useHCSAudit } from "../hooks/useHCSAudit";

export function ComplianceMonitor() {
  const { events } = useHCSAudit("audit");

  const approvals = events.filter((e) => ["TRANSFER", "MINT", "TOKEN_UNPAUSED", "WALLET_UNFROZEN"].includes(e.type)).length;
  const restrictions = events.filter((e) => ["TOKEN_PAUSED", "WALLET_FROZEN"].includes(e.type)).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white">Compliance Monitor</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Events</p>
          <p className="text-3xl font-mono text-white">{events.length}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Approvals</p>
          <p className="text-3xl font-mono text-bond-green">{approvals}</p>
        </div>
        <div className="bg-surface-2 border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Restrictions</p>
          <p className="text-3xl font-mono text-bond-red">{restrictions}</p>
        </div>
      </div>

      <AuditEventFeed topicType="audit" />
    </div>
  );
}
