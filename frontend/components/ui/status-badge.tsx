interface StatusBadgeProps {
  label: string;
  variant: "green" | "red" | "amber";
  className?: string;
}

const variantClasses: Record<StatusBadgeProps["variant"], string> = {
  green: "bg-bond-green/15 text-bond-green border-bond-green/20",
  red: "bg-bond-red/15 text-bond-red border-bond-red/20",
  amber: "bg-bond-amber/15 text-bond-amber border-bond-amber/20",
};

export function StatusBadge({ label, variant, className = "" }: StatusBadgeProps) {
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${variantClasses[variant]} ${className}`}>
      {label}
    </span>
  );
}
