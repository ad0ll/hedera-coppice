import { CheckIcon, XIcon, Spinner } from "@/components/ui/icons";

export type StepStatus = "pending" | "active" | "success" | "error";

export interface Step {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function StepProgress({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-1 bg-surface-3/50 rounded-lg p-4" aria-live="polite" aria-atomic="true">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {step.status === "pending" && (
              <div className="w-2 h-2 rounded-full bg-text-muted/30" />
            )}
            {step.status === "active" && (
              <Spinner variant="amber" aria-label="Processing" />
            )}
            {step.status === "success" && (
              <CheckIcon className="w-5 h-5 text-bond-green" />
            )}
            {step.status === "error" && (
              <XIcon className="w-5 h-5 text-bond-red" />
            )}
          </div>
          <div className="min-w-0">
            <span className={`text-sm ${
              step.status === "pending" ? "text-text-muted" :
              step.status === "error" ? "text-bond-red" :
              "text-text"
            }`}>
              {step.label}
            </span>
            {step.detail && (
              <p className="text-xs text-bond-red/80 mt-0.5">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
