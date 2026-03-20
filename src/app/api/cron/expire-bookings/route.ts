import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Find bookings requested more than 15 minutes ago
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: expiredBookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "requested")
      .lt("created_at", fifteenMinAgo)
      .returns<Booking[]>();

    if (error) throw error;

    let expiredCount = 0;

    for (const booking of expiredBookings ?? []) {
      try {
        // Expire the booking
        await supabase
          .from("bookings")
          .update({ status: "expired" })
          .eq("id", booking.id);

        // Create notifications for the renter
        await supabase.from("notifications").insert([
          {
            user_id: booking.renter_id,
            booking_id: booking.id,
            channel: "whatsapp" as const,
            template: "booking_expired",
            message_body:
              "Your booking request has expired because the owner did not respond in time. Please try another villa.",
            status: "pending" as const,
          },
          {
            user_id: booking.renter_id,
            booking_id: booking.id,
            channel: "in_app" as const,
            template: "booking_expired",
            message_body: "Booking request expired — owner did not respond.",
            status: "pending" as const,
          },
        ]);

        expiredCount++;
      } catch (err) {
        console.error(`Failed to expire booking ${booking.id}:`, err);
      }
    }

    return NextResponse.json({ expired: expiredCount });
  } catch (err) {
    console.error("Expire bookings cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
