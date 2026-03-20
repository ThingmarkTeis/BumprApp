import { formatIdr } from "@/lib/utils/currency";

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", SGD: "S$", DKK: "kr",
};

export default function BookingSummary({
  checkIn,
  checkOut,
  nights,
  nightlyRateIdr,
  totalAmountIdr,
  serviceFeeIdr,
  totalChargedIdr,
  fxRate,
  currency,
}: {
  checkIn: string;
  checkOut: string;
  nights: number;
  nightlyRateIdr: number;
  totalAmountIdr: number;
  serviceFeeIdr: number;
  totalChargedIdr: number;
  fxRate: number | null;
  currency: string;
}) {
  const symbol = SYMBOLS[currency] ?? currency;

  function convert(idr: number): string {
    if (!fxRate) return formatIdr(idr);
    return `≈ ${symbol}${Math.round(idr * fxRate).toLocaleString()}`;
  }

  return (
    <div className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-warm-gray-dark">Dates</span>
        <span className="text-volcanic font-mono">{checkIn} → {checkOut}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-warm-gray-dark">{formatIdr(nightlyRateIdr)} × {nights} nights</span>
        <span className="text-volcanic font-mono">{convert(totalAmountIdr)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-warm-gray-dark">Service fee (15%)</span>
        <span className="text-volcanic font-mono">{convert(serviceFeeIdr)}</span>
      </div>
      <div className="border-t border-warm-gray-light pt-3 flex justify-between">
        <span className="font-medium text-volcanic">Total</span>
        <span className="font-mono font-bold text-volcanic text-lg">
          {convert(totalChargedIdr)}
        </span>
      </div>
      <p className="text-xs text-warm-gray">
        {formatIdr(totalChargedIdr)} charged in IDR
      </p>
    </div>
  );
}
