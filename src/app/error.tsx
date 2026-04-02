"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">⚠</p>
        <h1 className="font-serif text-2xl font-bold text-volcanic mb-3">
          Something went wrong
        </h1>
        <p className="text-volcanic/60 mb-6">
          Something unexpected happened. Try again or head back to the dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg border border-volcanic/20 px-5 py-2.5 text-sm text-volcanic/70 hover:bg-volcanic/5"
          >
            Try again
          </button>
          <a
            href="/admin"
            className="rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-cream hover:bg-teal-dark"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
