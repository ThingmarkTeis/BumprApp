import Link from "next/link";
import { formatIdr } from "@/lib/utils/currency";

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", SGD: "S$", DKK: "kr",
};

export default function VillaCard({
  id,
  title,
  area,
  rateIdr,
  bedrooms,
  bathrooms,
  maxGuests,
  bumpNoticeHours,
  heroUrl,
  fxRate,
  currency,
}: {
  id: string;
  title: string;
  area: string;
  rateIdr: number;
  bedrooms: number;
  bathrooms: number | null;
  maxGuests: number;
  bumpNoticeHours: number;
  heroUrl: string | null;
  fxRate: number | null;
  currency: string;
}) {
  const symbol = SYMBOLS[currency] ?? currency;
  const converted = fxRate ? Math.round(rateIdr * fxRate) : null;

  return (
    <Link
      href={`/villa/${id}`}
      className="block rounded-2xl bg-white overflow-hidden shadow-[0_2px_16px_rgba(26,26,26,0.06)] hover:shadow-[0_8px_32px_rgba(26,26,26,0.08)] transition-shadow"
    >
      <div className="h-48 bg-cream-dark">
        {heroUrl ? (
          <img src={heroUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-volcanic/15 text-5xl">⌂</div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-serif font-semibold text-volcanic text-lg">{title}</h3>
        <p className="text-sm text-warm-gray-dark capitalize">{area}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-warm-gray-dark">
          <span>{bedrooms} bed</span>
          {bathrooms && <span>{bathrooms} bath</span>}
          <span>{maxGuests} guests</span>
        </div>
        <div className="flex items-end justify-between mt-3">
          <div>
            {converted !== null && (
              <p className="font-mono font-bold text-bumpr-orange">
                ≈ {symbol}{converted.toLocaleString()}
                <span className="text-warm-gray font-normal text-xs"> / night</span>
              </p>
            )}
            <p className="font-mono text-xs text-warm-gray">{formatIdr(rateIdr)}</p>
          </div>
          <span className="text-xs text-bumpr-orange-dark bg-bumpr-orange/10 rounded-full px-2 py-0.5">
            {bumpNoticeHours}hr notice
          </span>
        </div>
      </div>
    </Link>
  );
}
