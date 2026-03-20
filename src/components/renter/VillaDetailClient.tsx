"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatIdr } from "@/lib/utils/currency";
import { calculateNights } from "@/lib/utils/dates";

const SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", AUD: "A$", SGD: "S$", DKK: "kr",
};

const SERVICE_FEE_RATE = 0.15;

export default function VillaDetailClient({
  villaId,
  rateIdr,
  bumpNoticeHours,
  earliestCheckIn,
  checkInBy,
  fxRate,
  currency,
}: {
  villaId: string;
  rateIdr: number;
  bumpNoticeHours: number;
  earliestCheckIn: string;
  checkInBy: string;
  fxRate: number | null;
  currency: string;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"dates" | "summary">("dates");

  const symbol = SYMBOLS[currency] ?? currency;
  const converted = fxRate ? Math.round(rateIdr * fxRate) : null;

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  const totalIdr = rateIdr * nights;
  const feeIdr = Math.round(totalIdr * SERVICE_FEE_RATE);
  const chargedIdr = totalIdr + feeIdr;

  function convert(idr: number): string {
    if (!fxRate) return formatIdr(idr);
    return `≈ ${symbol}${Math.round(idr * fxRate).toLocaleString()}`;
  }

  async function handleBook() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villaId, checkIn, checkOut }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create booking.");
      }

      const booking = await res.json();
      router.push(`/booking/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-6 rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-6">
      {/* Price */}
      <div className="mb-5">
        {converted !== null && (
          <p className="font-mono text-2xl font-bold text-bumpr-orange">
            ≈ {symbol}{converted.toLocaleString()}
            <span className="text-warm-gray font-normal text-sm"> / night</span>
          </p>
        )}
        <p className="font-mono text-xs text-warm-gray">{formatIdr(rateIdr)}</p>
      </div>

      {step === "dates" && (
        <>
          {/* Date inputs */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-warm-gray-dark mb-1">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full rounded-lg border border-warm-gray-light px-3 py-2.5 text-sm text-volcanic"
              />
            </div>
            <div>
              <label className="block text-xs text-warm-gray-dark mb-1">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || new Date().toISOString().split("T")[0]}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full rounded-lg border border-warm-gray-light px-3 py-2.5 text-sm text-volcanic"
              />
            </div>
          </div>

          {/* Check-in times */}
          <p className="text-xs text-warm-gray mb-4">
            Check-in: {earliestCheckIn} – {checkInBy}
          </p>

          <button
            onClick={() => setStep("summary")}
            disabled={!checkIn || !checkOut || nights <= 0}
            className="w-full rounded-lg bg-bumpr-orange py-3 text-sm font-semibold text-white hover:bg-bumpr-orange-dark shadow-[0_4px_20px_rgba(255,163,20,0.25)] disabled:opacity-40 transition-colors"
          >
            Request to Book
          </button>
        </>
      )}

      {step === "summary" && nights > 0 && (
        <>
          {/* Booking summary */}
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-warm-gray-dark">Dates</span>
              <span className="text-volcanic font-mono text-xs">{checkIn} → {checkOut}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-warm-gray-dark">{formatIdr(rateIdr)} × {nights} nights</span>
              <span className="text-volcanic font-mono">{convert(totalIdr)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-warm-gray-dark">Service fee (15%)</span>
              <span className="text-volcanic font-mono">{convert(feeIdr)}</span>
            </div>
            <div className="border-t border-warm-gray-light pt-3 flex justify-between">
              <span className="font-medium text-volcanic">Total</span>
              <span className="font-mono font-bold text-volcanic">
                {convert(chargedIdr)}
              </span>
            </div>
          </div>

          <p className="text-xs text-warm-gray-dark mb-4 leading-relaxed">
            You&apos;ll be charged {formatIdr(chargedIdr)} now. If bumped, unused
            nights + their service fee are refunded.
          </p>

          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}

          <button
            onClick={handleBook}
            disabled={loading}
            className="w-full rounded-lg bg-bumpr-orange py-3 text-sm font-semibold text-white hover:bg-bumpr-orange-dark disabled:opacity-50 transition-colors mb-2"
          >
            {loading ? "Requesting..." : "Request Booking"}
          </button>
          <button
            onClick={() => setStep("dates")}
            className="w-full text-sm text-warm-gray-dark hover:text-volcanic"
          >
            Change dates
          </button>
        </>
      )}
    </div>
  );
}
