"use client";

import { useState } from "react";
import BookingCalendar from "./BookingCalendar";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatIdr } from "@/lib/utils/currency";
import Link from "next/link";

interface ActiveBooking {
  id: string;
  renterName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  protectionEndsAt: string | null;
  checkedInAt: string | null;
}

interface PastBooking {
  id: string;
  renterName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  nightlyRateIdr: number;
  nights: number;
}

export default function VillaManageClient({
  villaId,
  villaBumpNoticeHours,
  calendarDays,
  activeBookings,
  pastBookings,
  initialYear,
  initialMonth,
}: {
  villaId: string;
  villaBumpNoticeHours: number;
  calendarDays: { date: string; type: string; label?: string }[];
  activeBookings: ActiveBooking[];
  pastBookings: PastBooking[];
  initialYear: number;
  initialMonth: number;
}) {
  const [showPast, setShowPast] = useState(false);

  function isBumpable(b: ActiveBooking): boolean {
    if (b.status !== "active") return false;
    if (!b.protectionEndsAt) return false;
    return new Date() >= new Date(b.protectionEndsAt);
  }

  function protectionLabel(b: ActiveBooking): string {
    if (b.status !== "active" || !b.protectionEndsAt) return "";
    const end = new Date(b.protectionEndsAt);
    if (new Date() < end) {
      return `Protected until ${end.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    return "Bumpable";
  }

  return (
    <div className="space-y-8">
      {/* Calendar */}
      <section className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5">
        <BookingCalendar
          days={calendarDays.map((d) => ({
            date: d.date,
            type: d.type as "open" | "bumpr" | "external" | "bump_active",
            label: d.label,
          }))}
          initialYear={initialYear}
          initialMonth={initialMonth}
          onMonthChange={() => {}}
        />
      </section>

      {/* Active Bookings */}
      <section>
        <h2 className="font-serif text-xl font-semibold text-volcanic mb-4">
          Active Bookings
        </h2>
        {activeBookings.length === 0 ? (
          <div className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-6 text-center text-warm-gray text-sm">
            No active bookings
          </div>
        ) : (
          <div className="space-y-3">
            {activeBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-[16px] bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-volcanic">{b.renterName}</p>
                    <p className="text-sm text-warm-gray-dark font-mono mt-0.5">
                      {b.checkIn} → {b.checkOut}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {b.status === "active" && (
                  <div className="mt-3 flex items-center justify-between">
                    <p
                      className={`text-sm font-medium ${
                        isBumpable(b) ? "text-bumpr-orange" : "text-teal"
                      }`}
                    >
                      {protectionLabel(b)}
                    </p>
                    {isBumpable(b) && (
                      <Link
                        href={`/villa/${villaId}/bump?booking=${b.id}`}
                        className="rounded-lg bg-bumpr-orange px-4 py-2 text-sm font-semibold text-white hover:bg-bumpr-orange-dark transition-colors"
                      >
                        Trigger Bump
                      </Link>
                    )}
                  </div>
                )}

                {b.status === "bumped" && (
                  <p className="mt-3 text-sm text-bumpr-orange font-medium">
                    Bump in progress
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Bookings */}
      <section>
        <button
          onClick={() => setShowPast(!showPast)}
          className="flex items-center gap-2 text-sm text-warm-gray-dark hover:text-volcanic"
        >
          <span>{showPast ? "▾" : "▸"}</span>
          Past Bookings ({pastBookings.length})
        </button>
        {showPast && (
          <div className="mt-3 space-y-2">
            {pastBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-lg bg-white shadow-[0_2px_16px_rgba(26,26,26,0.06)] p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-volcanic">{b.renterName}</p>
                  <p className="text-xs text-warm-gray-dark font-mono">
                    {b.checkIn} → {b.checkOut}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-volcanic">
                    {formatIdr(b.nightlyRateIdr * b.nights)}
                  </p>
                  <StatusBadge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
