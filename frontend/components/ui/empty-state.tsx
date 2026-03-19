import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Controls the icon container background color */
  variant?: "default" | "danger";
  action?: ReactNode;
  wrapperClassName?: string;
  /** Additional classes on the card div (e.g. "max-w-lg w-full") */
  className?: string;
}

export function EmptyState({ icon, title, description, variant = "default", action, wrapperClassName, className = "" }: EmptyStateProps) {
  const iconBg = variant === "danger" ? "bg-bond-red/10" : "bg-surface-3";

  const card = (
    <div className={`card p-6 sm:p-12 text-center ${className}`}>
      <div className={`w-12 h-12 mx-auto mb-4 rounded-xl ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <h2 className="text-xl font-semibold text-text mb-2">{title}</h2>
      <p className="text-text-muted text-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{card}</div>;
  }

  return card;
}
