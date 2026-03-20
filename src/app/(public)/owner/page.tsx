import Link from "next/link";

export default function OwnerLandingPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <h1 className="font-serif text-4xl font-bold text-volcanic mb-4 text-center">
        Fill your empty villa nights
      </h1>
      <p className="text-warm-gray-dark text-lg mb-8 text-center max-w-lg">
        List your villa at standby rates and earn from nights that would
        otherwise sit empty. Keep full control — bump any time you get a
        full-price booking.
      </p>
      <Link
        href="/signup"
        className="rounded-lg bg-bumpr-orange px-8 py-3 text-white font-semibold hover:bg-bumpr-orange-dark transition-colors"
      >
        Get started
      </Link>
    </div>
  );
}
