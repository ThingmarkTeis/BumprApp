"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDeadline } from "@/lib/utils/dates";
import Link from "next/link";

interface BumpableBooking {
  id: string;
  renterName: string;
  checkIn: string;
  checkOut: string;
  checkedInAt: string | null;
}

const PLATFORMS = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking_com", label: "Booking.com" },
  { value: "direct", label: "Direct booking" },
  { value: "other", label: "Other" },
];

export default function BumpFlow({
  villaId,
  villaName,
  bumpNoticeHours,
  bumpableBookings,
  preselectedBookingId,
}: {
  villaId: string;
  villaName: string;
  bumpNoticeHours: number;
  bumpableBookings: BumpableBooking[];
  preselectedBookingId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "confirm" | "final" | "success" | "error">(
    preselectedBookingId && bumpableBookings.some((b) => b.id === preselectedBookingId)
      ? "confirm"
      : "select"
  );
  const [selectedBooking, setSelectedBooking] = useState<BumpableBooking | null>(
    bumpableBookings.find((b) => b.id === preselectedBookingId) ?? null
  );
  const [platform, setPlatform] = useState("airbnb");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const deadline = new Date(Date.now() + bumpNoticeHours * 60 * 60 * 1000);

  function selectBooking(b: BumpableBooking) {
    setSelectedBooking(b);
    setStep("confirm");
  }

  async function confirmBump() {
    if (!selectedBooking) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/villas/${villaId}/bump`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          externalPlatform: platform,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to trigger bump.");
      }

      setStep("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  // Step: No bumpable bookings
  if (bumpableBookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🛡</div>
        <h2 className="font-serif text-2xl font-bold text-volcanic mb-2">
          No bookings can be bumped
        </h2>
        <p className="text-volcanic/60 mb-6">
          Either there are no active bookings, or all guests are still in their
          protection window.
        </p>
        <Link
          href={`/villa/${villaId}/manage`}
          className="rounded-lg bg-bumpr-orange px-6 py-2.5 text-sm font-medium text-white"
        >
          Back to villa
        </Link>
      </div>
    );
  }

  // Step 1: Select booking
  if (step === "select") {
    return (
      <div>
        <h2 className="font-serif text-2xl font-bold text-volcanic mb-2">
          Trigger a Bump
        </h2>
        <p className="text-volcanic/60 mb-6">
          Select the booking you want to bump.
        </p>
        <div className="space-y-3">
          {bumpableBookings.map((b) => (
            <button
              key={b.id}
              onClick={() => selectBooking(b)}
              className="w-full rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5 text-left hover:shadow-[0_8px_32px_rgba(26,26,26,0.08)] transition-all"
            >
              <p className="font-medium text-volcanic">{b.renterName}</p>
              <p className="text-sm text-volcanic/60 font-mono mt-1">
                {b.checkIn} → {b.checkOut}
              </p>
              <span className="inline-block mt-2 text-xs font-medium text-bumpr-orange bg-bumpr-orange/10 rounded-full px-2.5 py-0.5">
                Bumpable
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Confirm details
  if (step === "confirm" && selectedBooking) {
    return (
      <div>
        <h2 className="font-serif text-2xl font-bold text-volcanic mb-6">
          Confirm Bump Details
        </h2>
        <div className="rounded-xl bg-white border border-volcanic/10 p-5 mb-6 space-y-3">
          <div>
            <p className="text-sm text-volcanic/50">Guest</p>
            <p className="font-medium text-volcanic">{selectedBooking.renterName}</p>
          </div>
          <div>
            <p className="text-sm text-volcanic/50">Staying</p>
            <p className="text-volcanic font-mono text-sm">
              {selectedBooking.checkIn} → {selectedBooking.checkOut}
            </p>
          </div>
          {selectedBooking.checkedInAt && (
            <div>
              <p className="text-sm text-volcanic/50">Checked in since</p>
              <p className="text-volcanic text-sm">
                {new Date(selectedBooking.checkedInAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-volcanic/50">Bump notice</p>
            <p className="text-volcanic">{bumpNoticeHours} hours</p>
          </div>
          <div>
            <p className="text-sm text-volcanic/50">Guest must leave by</p>
            <p className="font-medium text-amber-dark font-mono">
              {formatDeadline(deadline)}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-volcanic mb-3">
            Which platform is the full-price booking from?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPlatform(p.value)}
                className={`rounded-lg border px-4 py-2.5 text-sm ${
                  platform === p.value
                    ? "border-bumpr-orange bg-bumpr-orange/5 text-bumpr-orange font-medium"
                    : "border-warm-gray-light text-warm-gray-dark"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("select")}
            className="flex-1 rounded-lg border border-warm-gray-light py-3 text-sm text-warm-gray-dark"
          >
            Back
          </button>
          <button
            onClick={() => setStep("final")}
            className="flex-1 rounded-lg bg-bumpr-orange py-3 text-sm font-semibold text-white"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Final confirmation
  if (step === "final" && selectedBooking) {
    return (
      <div className="text-center">
        <div className="rounded-xl bg-volcanic-brown p-6 mb-6">
          <div className="text-3xl mb-3">⚡</div>
          <h2 className="font-serif text-xl font-bold text-white mb-3">
            You are about to bump {selectedBooking.renterName} from {villaName}
          </h2>
          <p className="text-white/70 text-sm mb-4">
            They will be notified immediately via WhatsApp and must check out by{" "}
            <strong className="text-bumpr-orange">{formatDeadline(deadline)}</strong>.
          </p>
          <p className="text-sm font-semibold text-bumpr-orange-light">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={confirmBump}
            disabled={loading}
            className="w-full rounded-lg bg-bumpr-orange py-4 text-lg font-bold text-white hover:bg-bumpr-orange-dark transition-colors disabled:opacity-50 shadow-[0_4px_20px_rgba(255,163,20,0.25)]"
          >
            {loading ? "Processing..." : "Confirm Bump"}
          </button>
          <button
            onClick={() => setStep("confirm")}
            disabled={loading}
            className="w-full rounded-lg border border-white/20 py-3 text-sm text-white/60"
          >
            Cancel — Go Back
          </button>
        </div>
      </div>
    );
  }

  // Success
  if (step === "success" && selectedBooking) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="font-serif text-2xl font-bold text-bumpr-orange mb-3">
          Bump triggered successfully
        </h2>
        <div className="rounded-xl bg-white border border-volcanic/10 p-5 mb-6 text-left space-y-2">
          <p className="text-sm text-volcanic">
            Your guest <strong>{selectedBooking.renterName}</strong> has been notified.
          </p>
          <p className="text-sm text-volcanic">
            Deadline:{" "}
            <strong className="font-mono">{formatDeadline(deadline)}</strong>
          </p>
          <p className="text-sm text-volcanic/60">
            We&apos;ll update you when they make arrangements.
          </p>
        </div>
        <Link
          href={`/villa/${villaId}/manage`}
          className="inline-block rounded-lg bg-bumpr-orange px-6 py-2.5 text-sm font-medium text-white"
        >
          Back to villa
        </Link>
      </div>
    );
  }

  // Error
  if (step === "error") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">✗</div>
        <h2 className="font-serif text-2xl font-bold text-bumpr-orange mb-3">
          Bump failed
        </h2>
        <p className="text-volcanic/60 mb-6">{errorMsg}</p>
        <button
          onClick={() => setStep("confirm")}
          className="rounded-lg bg-bumpr-orange px-6 py-2.5 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}
