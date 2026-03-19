import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-surface-3 flex items-center justify-center">
        <span className="text-2xl font-display text-text-muted">404</span>
      </div>
      <h2 className="text-xl font-semibold text-text mb-2">Page not found</h2>
      <p className="text-text-muted text-sm mb-4">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="btn-primary px-6 inline-block">
        Back to Invest
      </Link>
    </div>
  );
}
