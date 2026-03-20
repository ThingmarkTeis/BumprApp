"use client";

import { useState, useEffect } from "react";

export default function ProtectionTimer({
  protectionEndsAt,
  bumpNoticeHours,
}: {
  protectionEndsAt: string;
  bumpNoticeHours: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const endMs = new Date(protectionEndsAt).getTime();
  const remaining = endMs - now;
  const isProtected = remaining > 0;

  const hours = Math.floor(Math.abs(remaining) / 3600000);
  const mins = Math.floor((Math.abs(remaining) % 3600000) / 60000);
  const secs = Math.floor((Math.abs(remaining) % 60000) / 1000);

  return (
    <div
      className={`rounded-2xl p-6 text-center transition-colors duration-1000 ${
        isProtected ? "bg-teal text-white" : "bg-bumpr-orange text-white"
      }`}
    >
      <p className="text-sm font-medium text-white/80 mb-2">
        {isProtected ? "Protected — you cannot be bumped" : `You can now be bumped with ${bumpNoticeHours}hr notice`}
      </p>
      {isProtected && (
        <>
          <p className="font-mono text-3xl md:text-4xl font-bold text-white">
            {String(hours).padStart(2, "0")}:{String(mins).padStart(2, "0")}:
            {String(secs).padStart(2, "0")}
          </p>
          <p className="text-xs text-white/60 mt-2">
            Protection ends{" "}
            {new Date(protectionEndsAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </>
      )}
    </div>
  );
}
