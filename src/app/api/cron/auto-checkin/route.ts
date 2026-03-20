import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateProtectionEnd } from "@/lib/services/protection";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];

// Bali timezone: WITA = UTC+8
function getBaliNow(): Date {
  const now = new Date();
  // Convert to Bali time
  const baliOffset = 8 * 60; // UTC+8 in minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utcMs + baliOffset * 60 * 1000);
}

function getBaliDateString(): string {
  const bali = getBaliNow();
  return bali.toISOString().split("T")[0];
}

function getBaliTimeString(): string {
  const bali = getBaliNow();
  return bali.toTimeString().slice(0, 5); // "HH:MM"
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const today = getBaliDateString();
    const currentTime = getBaliTimeString();

    // Find confirmed bookings for today that haven't checked in
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .eq("check_in", today)
      .is("checked_in_at", null)
      .returns<Booking[]>();

    if (error) throw error;

    let checkedInCount = 0;

    for (const booking of bookings ?? []) {
      try {
        // Get the villa's earliest_check_in time
        const { data: villa } = await supabase
          .from("villas")
          .select("earliest_check_in")
          .eq("id", booking.villa_id)
          .single<Pick<Villa, "earliest_check_in">>();

        // If villa has no earliest_check_in, or current time is past it
        const earliestCheckIn = villa?.earliest_check_in ?? "14:00";
        if (currentTime < earliestCheckIn) continue;

        // Auto check-in
        const now = new Date();
        const protectionEnd = calculateProtectionEnd(now, booking.is_rebook);

        await supabase
          .from("bookings")
          .update({
            status: "active",
            checked_in_at: now.toISOString(),
            protection_ends_at: protectionEnd.toISOString(),
          })
          .eq("id", booking.id);

        checkedInCount++;
      } catch (err) {
        console.error(`Failed to auto check-in booking ${booking.id}:`, err);
      }
    }

    return NextResponse.json({ autoCheckedIn: checkedInCount });
  } catch (err) {
    console.error("Auto check-in cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
