import Link from "next/link";

export default function RenterLandingPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <h1 className="font-serif text-4xl font-bold text-volcanic mb-4 text-center">
        Villa living, reimagined
      </h1>
      <p className="text-warm-gray-dark text-lg mb-8 text-center max-w-lg">
        Bali&apos;s best villas at 25–30% of normal rates. The catch? You might
        get bumped if the owner lands a full-price booking. Fair deal, great
        living.
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
