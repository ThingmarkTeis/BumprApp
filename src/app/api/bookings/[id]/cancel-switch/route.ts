import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    // Fetch Villa A booking (the one with the scheduled auto-bump)
    const { data: villaABooking, error } = await admin
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single<Booking>();

    if (error || !villaABooking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    if (villaABooking.renter_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify auto-bump is scheduled and hasn't fired yet
    if (!villaABooking.auto_bump_scheduled_at) {
      return NextResponse.json(
        { error: "No switch is pending for this booking." },
        { status: 400 }
      );
    }

    // Check if the auto-bump has already fired (status changed to bumping)
    if (villaABooking.status === "bumping" || villaABooking.status === "bumped") {
      return NextResponse.json(
        { error: "The auto-bump has already been triggered. Cannot cancel the switch." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Cancel Villa B booking if it exists
    if (villaABooking.switched_to_booking_id) {
      await admin
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_at: now.toISOString(),
          cancellation_reason: "Switch cancelled by renter",
        })
        .eq("id", villaABooking.switched_to_booking_id);
    }

    // Clear the auto-bump schedule on Villa A
    const { data: updated, error: updateError } = await admin
      .from("bookings")
      .update({
        auto_bump_scheduled_at: null,
        auto_bump_triggered_by: null,
        switched_to_booking_id: null,
      })
      .eq("id", id)
      .select()
      .single<Booking>();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      booking_id: updated.id,
      status: updated.status,
      auto_bump_cancelled: true,
      message: "Switch cancelled. Your current booking remains active.",
    });
  } catch (err) {
    console.error("Cancel switch error:", err);
    return NextResponse.json(
      { error: "Failed to cancel switch." },
      { status: 500 }
    );
  }
}
