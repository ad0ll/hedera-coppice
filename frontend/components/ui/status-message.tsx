interface StatusMessageProps {
  status: { type: "success" | "error"; msg: string } | null;
  className?: string;
}

export function StatusMessage({ status, className = "" }: StatusMessageProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      {status && (
        <p className={status.type === "success" ? "status-msg-success" : "status-msg-error"}>
          {status.msg}
        </p>
      )}
    </div>
  );
}
