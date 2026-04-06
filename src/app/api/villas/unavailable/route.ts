import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/villas/unavailable — Returns villa IDs that are currently occupied or blocked.
// Uses admin client so it bypasses RLS and sees all bookings.
export async function GET() {
  try {
    const admin = createAdminClient();
    const todayStr = new Date().toISOString().split("T")[0];

    // Villas with an active booking covering today
    const { data: occupiedBookings } = await admin
      .from("bookings")
      .select("villa_id")
      .in("status", ["confirmed", "active", "bumping"])
      .lte("check_in", todayStr)
      .gt("check_out", todayStr);

    // Villas blocked today (external / manual)
    const { data: blockedNow } = await admin
      .from("external_availability")
      .select("villa_id")
      .lte("blocked_start", todayStr)
      .gt("blocked_end", todayStr);

    // Villas with any future confirmed booking (for "available until" display)
    const { data: upcomingBookings } = await admin
      .from("bookings")
      .select("villa_id, check_in")
      .in("status", ["confirmed", "active", "bumping"])
      .gt("check_in", todayStr)
      .order("check_in");

    const { data: upcomingBlocks } = await admin
      .from("external_availability")
      .select("villa_id, blocked_start")
      .gt("blocked_start", todayStr)
      .order("blocked_start");

    // Villa IDs that are unavailable right now
    const unavailableIds = [
      ...new Set([
        ...(occupiedBookings ?? []).map((b) => b.villa_id),
        ...(blockedNow ?? []).map((b) => b.villa_id),
      ]),
    ];

    // Earliest upcoming booking/block per villa (for "available until" badges)
    const cutoffs: Record<string, string> = {};
    for (const b of upcomingBookings ?? []) {
      if (!cutoffs[b.villa_id] || b.check_in < cutoffs[b.villa_id]) {
        cutoffs[b.villa_id] = b.check_in;
      }
    }
    for (const b of upcomingBlocks ?? []) {
      if (!cutoffs[b.villa_id] || b.blocked_start < cutoffs[b.villa_id]) {
        cutoffs[b.villa_id] = b.blocked_start;
      }
    }

    return NextResponse.json({ unavailableIds, cutoffs });
  } catch (err) {
    console.error("Unavailable villas error:", err);
    return NextResponse.json({ error: "Failed to fetch availability." }, { status: 500 });
  }
}
