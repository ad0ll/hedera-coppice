interface StatusMessageProps {
  status: { type: "success" | "error"; msg: string } | null;
  className?: string;
}

export function StatusMessage({ status, className = "" }: StatusMessageProps) {
  if (!status) return null;
  return (
    <p className={`${status.type === "success" ? "status-msg-success" : "status-msg-error"} ${className}`}>
      {status.msg}
    </p>
  );
}
