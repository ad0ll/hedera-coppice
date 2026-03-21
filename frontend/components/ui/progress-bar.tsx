interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: "green" | "amber";
  size?: "sm" | "md";
}

export function ProgressBar({
  value,
  max,
  label,
  color = "green",
  size = "md",
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = color === "green" ? "bg-bond-green" : "bg-bond-amber";
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={`w-full ${height} bg-surface-3 rounded-full overflow-hidden`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 animate-progress-grow ${barColor}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
