"use client";

import { useState } from "react";

interface CalendarDay {
  date: string; // YYYY-MM-DD
  type: "open" | "bumpr" | "external" | "bump_active" | "today_open" | "today_bumpr";
  label?: string;
}

interface BookingCalendarProps {
  days: CalendarDay[];
  initialYear: number;
  initialMonth: number;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

const DAY_COLORS: Record<string, string> = {
  open: "bg-white",
  bumpr: "bg-bumpr-orange/20 text-bumpr-orange-dark",
  external: "bg-teal/20 text-teal",
  bump_active: "bg-bumpr-orange text-white",
  today_open: "bg-white ring-2 ring-teal",
  today_bumpr: "bg-bumpr-orange/20 text-bumpr-orange-dark ring-2 ring-volcanic",
};

export default function BookingCalendar({
  days,
  initialYear,
  initialMonth,
  onMonthChange,
}: BookingCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const dayMap = new Map(days.map((d) => [d.date, d]));
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = new Date().toISOString().split("T")[0];

  function navigate(dir: -1 | 1) {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDay(null);
    onMonthChange(newYear, newMonth);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg px-3 py-1.5 text-sm text-warm-gray-dark hover:bg-cream-dark"
        >
          ‹ Prev
        </button>
        <h3 className="font-serif text-lg font-semibold text-volcanic">
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg px-3 py-1.5 text-sm text-warm-gray-dark hover:bg-cream-dark"
        >
          Next ›
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-warm-gray py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const calDay = dayMap.get(dateStr);
          const isToday = dateStr === todayStr;

          let type = calDay?.type ?? "open";
          if (isToday && type === "open") type = "today_open";
          if (isToday && type === "bumpr") type = "today_bumpr";

          const color = DAY_COLORS[type] ?? DAY_COLORS.open;

          return (
            <button
              key={dateStr}
              onClick={() =>
                setSelectedDay(
                  calDay ?? { date: dateStr, type: "open" }
                )
              }
              className={`aspect-square flex items-center justify-center rounded-lg text-sm font-mono ${color} hover:opacity-80 transition-opacity ${
                selectedDay?.date === dateStr ? "ring-2 ring-volcanic" : ""
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-warm-gray">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-bumpr-orange/20 border border-bumpr-orange/30" /> Bumpr booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-teal/20 border border-teal/30" /> External
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-bumpr-orange border border-bumpr-orange" /> Bump active
        </span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-4 rounded-lg bg-white border border-warm-gray-light p-3">
          <p className="text-sm font-medium text-volcanic">{selectedDay.date}</p>
          <p className="text-sm text-volcanic/60 capitalize mt-0.5">
            {selectedDay.type.replace(/_/g, " ")}
            {selectedDay.label && ` — ${selectedDay.label}`}
          </p>
        </div>
      )}
    </div>
  );
}
