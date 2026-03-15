interface IconProps {
  className?: string;
}

export function CheckIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function XIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function WarningIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
    </svg>
  );
}

export function Spinner({ variant = "default", className, "aria-label": ariaLabel, "aria-hidden": ariaHidden }: {
  variant?: "default" | "amber";
  className?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}) {
  const base = className ?? "w-4 h-4";
  const colorClasses = variant === "amber"
    ? "border-bond-amber/40 border-t-bond-amber"
    : "border-text-muted/40 border-t-text-muted";
  return (
    <span
      className={`inline-block ${base} border-2 ${colorClasses} rounded-full animate-spin`}
      role={ariaHidden ? undefined : "status"}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
}
