import { formatNumber } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";

interface SptStatusProps {
  totalVerified: number;
  target: number;
  met: boolean;
  projectCount?: number;
  baseRate?: string;
  penaltyRate?: string;
  variant?: "full" | "compact";
}

export function SptStatus({
  totalVerified,
  target,
  met,
  projectCount,
  baseRate = "4.25%",
  penaltyRate = "4.50%",
  variant = "full",
}: SptStatusProps) {
  const progress = Math.min((totalVerified / target) * 100, 100);

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">SPT Progress</span>
          <span className="font-mono text-text">
            {formatNumber(totalVerified)} / {formatNumber(target)} tCO₂e
          </span>
        </div>
        <ProgressBar value={totalVerified} max={target} label="SPT Progress" color={met ? "green" : "amber"} size="sm" />
      </div>
    );
  }

  return (
    <div className={`card-static ${met ? "animate-glow-pulse" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text">
          Sustainability Performance Target
        </h2>
        <StatusBadge
          label={met ? "Target Met" : "Below Target"}
          variant={met ? "green" : "amber"}
        />
      </div>
      <p className="text-sm text-text-muted mb-4">
        Avoid {formatNumber(target)} tCO₂e per coupon period across all
        funded projects. Failure triggers a 25bps coupon step-up.
      </p>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Progress</span>
          <span className="font-mono text-text">
            {formatNumber(totalVerified)} / {formatNumber(target)} tCO₂e
          </span>
        </div>
        <ProgressBar value={totalVerified} max={target} label="Sustainability Performance Target progress" color={met ? "green" : "amber"} />
        <p className="text-xs text-text-muted">
          {progress.toFixed(1)}% of target achieved
        </p>
      </div>
      {projectCount !== undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 text-xs border-t border-surface-3 pt-3 mt-4">
          <div>
            <span className="text-text-muted">Base Rate</span>
            <p className="font-mono text-text mt-0.5">{baseRate}</p>
          </div>
          <div>
            <span className="text-text-muted">Penalty Rate</span>
            <p className="font-mono text-bond-amber mt-0.5">{penaltyRate}</p>
          </div>
          <div>
            <span className="text-text-muted">Required Rate</span>
            <p className={`font-mono mt-0.5 ${met ? "text-bond-green" : "text-bond-amber"}`}>
              {met ? baseRate : penaltyRate}
            </p>
          </div>
          <div>
            <span className="text-text-muted">Projects</span>
            <p className="font-mono text-text mt-0.5">{projectCount}</p>
          </div>
        </div>
      )}
    </div>
  );
}
