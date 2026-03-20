"use client";

import { useState, useEffect } from "react";

export default function BumpDeadlineTimer({
  deadline,
}: {
  deadline: string;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const endMs = new Date(deadline).getTime();
  const remaining = Math.max(0, endMs - now);
  const hours = Math.floor(remaining / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isPast = remaining <= 0;

  const deadlineDate = new Date(deadline);

  const urgent = remaining > 0 && remaining < 2 * 3600000;

  return (
    <div className={`rounded-2xl text-white p-6 md:p-8 text-center ${urgent ? "bg-red-500" : "bg-bumpr-orange"}`}>
      <p className="text-sm text-white/80 font-medium mb-1">
        Check out by
      </p>
      <p className="font-serif text-base md:text-lg text-white mb-4">
        {deadlineDate.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}{" "}
        at{" "}
        {deadlineDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      {isPast ? (
        <p className="font-mono text-3xl font-bold text-white/80">
          Deadline passed
        </p>
      ) : (
        <p className="font-mono text-5xl md:text-6xl font-bold text-white tracking-tight">
          {String(hours).padStart(2, "0")}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </p>
      )}
      {!isPast && (
        <p className="text-sm text-white/60 mt-2">until checkout deadline</p>
      )}
    </div>
  );
}
