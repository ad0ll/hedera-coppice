"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-bond-red/10 flex items-center justify-center">
        <svg aria-hidden="true" className="w-6 h-6 text-bond-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-text mb-2">Something went wrong</h2>
      <p className="text-text-muted text-sm mb-4 max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="btn-primary px-6">
        Try again
      </button>
    </div>
  );
}
