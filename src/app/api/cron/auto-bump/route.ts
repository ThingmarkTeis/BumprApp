import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const BUMP_NOTICE_HOURS = 18;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // --- Phase 1: Fire scheduled auto-bumps ---
    // Find bookings where auto_bump_scheduled_at <= now AND still confirmed
    const { data: pendingBumps, error: pendingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .not("auto_bump_scheduled_at", "is", null)
      .lte("auto_bump_scheduled_at", nowIso)
      .returns<Booking[]>();

    if (pendingError) throw pendingError;

    let firedCount = 0;

    for (const booking of pendingBumps ?? []) {
      try {
        // Transition: confirmed -> bumping
        await supabase
          .from("bookings")
          .update({
            status: "bumping",
            bumped_at: nowIso,
          })
          .eq("id", booking.id);

        firedCount++;
      } catch (err) {
        console.error(`Failed to fire auto-bump for booking ${booking.id}:`, err);
      }
    }

    // --- Phase 2: Complete bumping bookings past 18h window ---
    // Find bookings where status = bumping AND bumped_at + 18h <= now
    const eighteenHoursAgo = new Date(
      now.getTime() - BUMP_NOTICE_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: expiredBumping, error: expiredError } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "bumping")
      .not("bumped_at", "is", null)
      .lte("bumped_at", eighteenHoursAgo)
      .returns<Booking[]>();

    if (expiredError) throw expiredError;

    let completedCount = 0;

    for (const booking of expiredBumping ?? []) {
      try {
        // Transition: bumping -> bumped (moves to Past)
        await supabase
          .from("bookings")
          .update({
            status: "bumped",
            completed_at: nowIso,
          })
          .eq("id", booking.id);

        completedCount++;
      } catch (err) {
        console.error(`Failed to complete bumping for booking ${booking.id}:`, err);
      }
    }

    return NextResponse.json({
      auto_bumps_fired: firedCount,
      bumping_completed: completedCount,
    });
  } catch (err) {
    console.error("Auto-bump cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
