import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-6xl mb-4">🏝</p>
        <h1 className="font-serif text-3xl font-bold text-teal mb-3">
          Page not found
        </h1>
        <p className="text-volcanic/60 mb-6">
          This villa has been bumped into another dimension.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-cream hover:bg-teal-dark"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
