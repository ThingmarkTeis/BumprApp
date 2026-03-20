"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApproveBookingClient({
  bookingId,
  expiresAt,
}: {
  bookingId: string;
  expiresAt: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${String(secs).padStart(2, "0")}`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  async function handleApprove() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to approve.");
      }
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (approved) {
    return (
      <div className="rounded-xl bg-bumpr-orange/5 border border-bumpr-orange/20 p-6 text-center">
        <div className="text-3xl mb-3">✓</div>
        <p className="font-serif text-lg font-semibold text-bumpr-orange mb-2">
          Booking approved!
        </p>
        <p className="text-sm text-warm-gray-dark">
          The guest will now complete payment.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Countdown */}
      <div
        className={`rounded-lg p-3 text-center mb-6 ${
          expired
            ? "bg-cream-dark border border-warm-gray-light"
            : "bg-bumpr-orange/10 border border-bumpr-orange/20"
        }`}
      >
        <p className="text-sm text-warm-gray-dark">
          {expired ? "Request expired" : "Request expires in"}
        </p>
        <p
          className={`font-mono text-2xl font-bold ${
            expired ? "text-warm-gray-dark" : "text-bumpr-orange"
          }`}
        >
          {timeLeft}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex-1 rounded-lg border border-warm-gray-light py-3 text-sm text-warm-gray-dark"
        >
          Decline
        </button>
        <button
          onClick={handleApprove}
          disabled={loading || expired}
          className="flex-1 rounded-lg bg-bumpr-orange py-3 text-sm font-semibold text-white hover:bg-bumpr-orange-dark disabled:opacity-50"
        >
          {loading ? "Approving..." : "Approve Booking"}
        </button>
      </div>
    </div>
  );
}
