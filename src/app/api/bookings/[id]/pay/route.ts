import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initiateBookingPayment } from "@/lib/integrations/xendit/flows";
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

    // Verify user is the renter
    const { data: booking } = await supabase
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

    if (booking.status !== "approved") {
      return NextResponse.json(
        { error: "Booking must be approved before payment." },
        { status: 400 }
      );
    }

    const { checkoutUrl } = await initiateBookingPayment(bookingId);

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("Payment initiation error:", err);
    return NextResponse.json(
      { error: "Failed to initiate payment." },
      { status: 500 }
    );
  }
}
