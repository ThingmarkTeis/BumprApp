"use client";

import { formatIdr } from "@/lib/utils/currency";

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", SGD: "S$", DKK: "kr",
};

export interface VillaPreview {
  id: string;
  title: string;
  area: string;
  rateIdr: number;
  bedrooms: number;
  bumpNoticeHours: number;
  heroUrl: string | null;
}

export default function VillaPreviewCard({
  villa,
  fxRate,
  currency,
  onClick,
}: {
  villa: VillaPreview;
  fxRate: number | null;
  currency: string;
  onClick: () => void;
}) {
  const symbol = SYMBOLS[currency] ?? currency;
  const converted = fxRate ? Math.round(villa.rateIdr * fxRate) : null;

  return (
    <button
      onClick={onClick}
      className="flex gap-3 rounded-[16px] bg-white shadow-[0_8px_32px_rgba(26,26,26,0.08)] p-3 w-full text-left"
    >
      <div className="h-20 w-20 rounded-lg bg-volcanic/5 shrink-0 overflow-hidden">
        {villa.heroUrl ? (
          <img src={villa.heroUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-volcanic/15 text-2xl">⌂</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-serif font-semibold text-volcanic truncate">{villa.title}</h4>
        <p className="text-xs text-warm-gray-dark capitalize">{villa.area} · {villa.bedrooms} bed</p>
        <div className="flex items-end justify-between mt-1.5">
          <div>
            {converted !== null && (
              <p className="font-mono font-bold text-sm text-bumpr-orange">
                ≈ {symbol}{converted.toLocaleString()}<span className="text-warm-gray font-normal text-xs"> /n</span>
              </p>
            )}
            <p className="font-mono text-[10px] text-warm-gray">{formatIdr(villa.rateIdr)}</p>
          </div>
          <span className="text-[10px] text-bumpr-orange-dark bg-bumpr-orange/10 rounded-full px-1.5 py-0.5">
            {villa.bumpNoticeHours}hr
          </span>
        </div>
      </div>
    </button>
  );
}
