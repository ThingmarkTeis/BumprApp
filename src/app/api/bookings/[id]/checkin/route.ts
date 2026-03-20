import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateProtectionEnd } from "@/lib/services/protection";
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

    const { data: booking } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single<Booking>();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.renter_id !== user.id) {
      return NextResponse.json({ error: "Not your booking." }, { status: 403 });
    }

    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "Booking must be confirmed to check in." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    if (today < booking.check_in) {
      return NextResponse.json(
        { error: "Cannot check in before the check-in date." },
        { status: 400 }
      );
    }

    const now = new Date();
    const protectionEnd = calculateProtectionEnd(now, booking.is_rebook);

    const { data: updated, error } = await admin
      .from("bookings")
      .update({
        status: "active",
        checked_in_at: now.toISOString(),
        protection_ends_at: protectionEnd.toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single<Booking>();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Check-in error:", err);
    return NextResponse.json(
      { error: "Failed to check in." },
      { status: 500 }
    );
  }
}
