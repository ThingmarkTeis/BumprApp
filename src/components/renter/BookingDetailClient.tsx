"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingDetailClient({
  bookingId,
  action,
  checkIn,
}: {
  bookingId: string;
  action: "pay" | "checkin";
  checkIn?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Payment failed.");
      }
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function handleCheckin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Check-in failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Only show check-in button on or after check-in date
  if (action === "checkin") {
    const today = new Date().toISOString().split("T")[0];
    if (checkIn && today < checkIn) {
      return (
        <p className="text-center text-sm text-volcanic/50">
          Check-in available from {checkIn}
        </p>
      );
    }
  }

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 mb-3 text-center">{error}</p>
      )}
      <button
        onClick={action === "pay" ? handlePay : handleCheckin}
        disabled={loading}
        className={`w-full rounded-lg py-3.5 text-sm font-semibold text-cream transition-colors disabled:opacity-50 ${
          action === "pay"
            ? "bg-bumpr-orange hover:bg-bumpr-orange-dark"
            : "bg-bumpr-orange hover:bg-bumpr-orange-dark"
        }`}
      >
        {loading
          ? "Processing..."
          : action === "pay"
            ? "Pay Now"
            : "I've Arrived — Check In"}
      </button>
    </div>
  );
}
