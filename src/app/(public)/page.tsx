import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section — bumpr orange with white logo */}
      <div className="bg-bumpr-orange px-4 pt-16 pb-12 text-center">
        <img src="/logo-white.png" alt="Bumpr" className="h-8 md:h-11 mx-auto mb-4" />
        <p className="text-white/80 text-base max-w-sm mx-auto">
          Standby villa rentals in Bali — affordable luxury with a twist.
        </p>
      </div>

      {/* Cards section — cream */}
      <div className="flex-1 bg-cream px-4 -mt-6">
        <div className="w-full max-w-sm md:max-w-2xl mx-auto md:flex md:gap-5 space-y-4 md:space-y-0">
          <Link
            href="/owner"
            className="block flex-1 rounded-2xl bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-6 text-center hover:shadow-[0_8px_32px_rgba(26,26,26,0.08)] transition-all"
          >
            <p className="text-2xl mb-2">🏡</p>
            <p className="font-serif text-lg font-semibold text-volcanic mb-1">
              I&apos;m a villa owner
            </p>
            <p className="text-sm text-warm-gray-dark">
              Fill your empty nights at standby rates
            </p>
          </Link>

          <Link
            href="/renter"
            className="block flex-1 rounded-2xl bg-volcanic p-6 text-center hover:bg-volcanic-light transition-all"
          >
            <p className="text-2xl mb-2">🌴</p>
            <p className="font-serif text-lg font-semibold text-white mb-1">
              I&apos;m looking for a villa
            </p>
            <p className="text-sm text-white/70">
              Live the villa life for less
            </p>
          </Link>
        </div>

        <p className="text-sm text-warm-gray mt-10 text-center pb-8">
          Already have an account?{" "}
          <Link href="/login" className="text-bumpr-orange font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
