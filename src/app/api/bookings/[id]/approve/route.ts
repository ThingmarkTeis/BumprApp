import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get booking
    const { data: booking } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single<Booking>();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status !== "requested") {
      return NextResponse.json(
        { error: `Cannot approve a booking with status '${booking.status}'.` },
        { status: 400 }
      );
    }

    // Verify user owns the villa
    const { data: villa } = await admin
      .from("villas")
      .select("owner_id")
      .eq("id", booking.villa_id)
      .single<{ owner_id: string }>();

    if (!villa || villa.owner_id !== user.id) {
      return NextResponse.json(
        { error: "You do not own this villa." },
        { status: 403 }
      );
    }

    // Approve
    const { data: updated, error } = await admin
      .from("bookings")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", bookingId)
      .select()
      .single<Booking>();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Approve booking error:", err);
    return NextResponse.json(
      { error: "Failed to approve booking." },
      { status: 500 }
    );
  }
}
