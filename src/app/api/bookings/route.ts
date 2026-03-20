import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { calculateNights } from "@/lib/utils/dates";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const SERVICE_FEE_RATE = 0.15;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { villaId, checkIn, checkOut } = body as {
      villaId: string;
      checkIn: string;
      checkOut: string;
    };

    if (!villaId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: "villaId, checkIn, and checkOut are required." },
        { status: 400 }
      );
    }

    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: "Check-out must be after check-in." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Validate villa
    const { data: villa } = await admin
      .from("villas")
      .select("*")
      .eq("id", villaId)
      .single<Villa>();

    if (!villa || villa.status !== "active") {
      return NextResponse.json(
        { error: "Villa not found or not active." },
        { status: 404 }
      );
    }

    // Check availability
    const { data: conflicts } = await admin.rpc("check_villa_availability", {
      villa_uuid: villaId,
      desired_check_in: checkIn,
      desired_check_out: checkOut,
    });

    if (conflicts && (conflicts as unknown[]).length > 0) {
      return NextResponse.json(
        { error: "Villa is not available for the selected dates." },
        { status: 409 }
      );
    }

    // Check max 3 active bookings
    const { data: activeCount } = await admin.rpc("count_active_bookings", {
      renter_uuid: user.id,
    });

    if ((activeCount as number) >= 3) {
      return NextResponse.json(
        { error: "Maximum 3 active bookings allowed." },
        { status: 409 }
      );
    }

    // Get renter profile
    const { data: profile } = await admin
      .from("profiles")
      .select("preferred_currency, full_name")
      .eq("id", user.id)
      .single<{ preferred_currency: string; full_name: string }>();

    const renterCurrency = profile?.preferred_currency ?? "USD";

    const { data: rateRow } = await admin
      .from("exchange_rates")
      .select("rate_from_idr")
      .eq("currency_code", renterCurrency)
      .single<{ rate_from_idr: number }>();

    // Calculate pricing
    const nights = calculateNights(checkIn, checkOut);
    const totalAmountIdr = villa.standby_rate_idr * nights;
    const serviceFeeIdr = Math.round(totalAmountIdr * SERVICE_FEE_RATE);
    const totalChargedIdr = totalAmountIdr + serviceFeeIdr;

    // Create booking
    const { data: booking, error } = await admin
      .from("bookings")
      .insert({
        villa_id: villaId,
        renter_id: user.id,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        nightly_rate_idr: villa.standby_rate_idr,
        total_amount_idr: totalAmountIdr,
        service_fee_idr: serviceFeeIdr,
        total_charged_idr: totalChargedIdr,
        fx_rate_to_renter: rateRow?.rate_from_idr ?? null,
        renter_currency: renterCurrency,
        status: "requested",
      })
      .select()
      .single<Booking>();

    if (error) throw error;

    // Notify owner
    await admin.from("notifications").insert([
      {
        user_id: villa.owner_id,
        booking_id: booking.id,
        channel: "whatsapp" as const,
        template: "booking_request_owner",
        message_body: `New booking request from ${profile?.full_name ?? "a renter"} for ${villa.title} (${checkIn} to ${checkOut}). Please approve within 15 minutes.`,
        status: "pending" as const,
      },
      {
        user_id: villa.owner_id,
        booking_id: booking.id,
        channel: "in_app" as const,
        template: "booking_request_owner",
        message_body: `New booking request for ${villa.title}.`,
        status: "pending" as const,
      },
    ]);

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    console.error("Create booking error:", err);
    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 }
    );
  }
}
