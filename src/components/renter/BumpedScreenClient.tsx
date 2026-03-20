"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BumpedScreenClient({
  bumpId,
  rebookUrl,
  currentResponse,
}: {
  bumpId: string;
  rebookUrl: string;
  currentResponse: string | null;
}) {
  const router = useRouter();
  const [responding, setResponding] = useState(false);
  const [response, setResponse] = useState(currentResponse);

  async function respond(choice: "rebooking" | "accepted_deadline" | "left_early") {
    setResponding(true);
    try {
      // We need a bump respond API — use a simple fetch
      await fetch(`/api/bumps/${bumpId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: choice }),
      });
      setResponse(choice);
    } finally {
      setResponding(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Option 1: Find a new villa */}
      <div className="rounded-xl bg-white border-2 border-bumpr-orange/20 p-5">
        <h3 className="font-serif font-semibold text-bumpr-orange mb-1">
          Find a new villa
        </h3>
        <p className="text-sm text-volcanic/60 mb-3">
          Browse available villas for your remaining dates
        </p>
        <Link
          href={rebookUrl}
          onClick={() => { if (!response) respond("rebooking"); }}
          className="inline-block rounded-lg bg-bumpr-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-bumpr-orange-dark transition-colors"
        >
          Browse alternatives
        </Link>
      </div>

      {/* Option 2: Stay until deadline */}
      <div className={`rounded-xl bg-white border border-volcanic/10 p-5 ${response === "accepted_deadline" ? "border-bumpr-orange/20 bg-bumpr-orange/5" : ""}`}>
        <h3 className="font-serif font-semibold text-volcanic mb-1">
          Stay until the deadline
        </h3>
        <p className="text-sm text-volcanic/60 mb-3">
          You can stay until the checkout time above. No need to rush.
        </p>
        {response === "accepted_deadline" ? (
          <p className="text-sm font-medium text-bumpr-orange">You&apos;re staying until the deadline</p>
        ) : (
          <button
            onClick={() => respond("accepted_deadline")}
            disabled={responding}
            className="rounded-lg border border-warm-gray-light px-5 py-2 text-sm text-warm-gray-dark hover:bg-volcanic/5 disabled:opacity-50"
          >
            {responding ? "..." : "I'll stay until the deadline"}
          </button>
        )}
      </div>

      {/* Option 3: Leave earlier */}
      <div className={`rounded-xl bg-white border border-volcanic/10 p-5 ${response === "left_early" ? "border-bumpr-orange/20 bg-bumpr-orange/5" : ""}`}>
        <h3 className="font-serif font-semibold text-volcanic mb-1">
          Leave earlier
        </h3>
        <p className="text-sm text-volcanic/60 mb-3">
          Check out whenever you&apos;re ready before the deadline.
        </p>
        {response === "left_early" ? (
          <p className="text-sm font-medium text-bumpr-orange">Thanks for letting us know</p>
        ) : (
          <button
            onClick={() => respond("left_early")}
            disabled={responding}
            className="rounded-lg border border-warm-gray-light px-5 py-2 text-sm text-warm-gray-dark hover:bg-volcanic/5 disabled:opacity-50"
          >
            {responding ? "..." : "I'm leaving early"}
          </button>
        )}
      </div>
    </div>
  );
}
