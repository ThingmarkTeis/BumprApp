import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import type { BookingResponse } from "@/types/booking";
import { createBookingSchema } from "@/lib/validations/booking";
import { calculateNights } from "@/lib/utils/dates";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const SERVICE_FEE_RATE = 0.15;

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Normalize field names (accept both web and mobile conventions)
    const villaId = data.villa_id ?? data.villaId!;
    const checkIn = data.check_in_date ?? data.checkIn!;
    const checkOut = data.check_out_date ?? data.checkOut!;
    const guestCount = data.num_guests ?? data.guests ?? null;
    const arrivalTime = data.arrival_time ?? data.arrivalTime ?? null;
    const arrivalToday = data.arrivalToday ?? null;
    const houseRulesAccepted = data.house_rules_accepted ?? null;
    const paymentMethod = data.payment_method ?? "cash_on_arrival";

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

    // Validate guest count
    if (guestCount !== null && guestCount > villa.max_guests) {
      return NextResponse.json(
        { error: `Maximum ${villa.max_guests} guests allowed.` },
        { status: 400 }
      );
    }

    // Normalize arrival time to HH:MM for comparison and storage
    let arrivalTime24 = arrivalTime;
    if (arrivalTime) {
      // Convert "2:30 PM" → "14:30" if needed
      const match = arrivalTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        let h = parseInt(match[1]);
        const m = match[2];
        const period = match[3].toUpperCase();
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        arrivalTime24 = `${String(h).padStart(2, "0")}:${m}`;
      }
    }

    // Validate arrival time against villa's earliest check-in
    if (arrivalTime24 && villa.earliest_check_in) {
      if (arrivalTime24 < villa.earliest_check_in) {
        return NextResponse.json(
          { error: `Earliest check-in is ${villa.earliest_check_in}.` },
          { status: 400 }
        );
      }
    }

    // Check for overlapping bookings at the same villa by this renter
    const { data: overlapping } = await admin
      .from("bookings")
      .select("id")
      .eq("villa_id", villaId)
      .eq("renter_id", user.id)
      .in("status", ["requested", "approved", "confirmed", "active"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: "You already have an active booking at this villa for overlapping dates." },
        { status: 409 }
      );
    }

    // Check villa availability (iCal conflicts / confirmed full-price bookings)
    try {
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
    } catch {
      // RPC may not exist yet — skip availability check gracefully
    }

    // Check max 3 active bookings per renter
    try {
      const { data: activeCount } = await admin.rpc("count_active_bookings", {
        renter_uuid: user.id,
      });

      if ((activeCount as number) >= 3) {
        return NextResponse.json(
          { error: "Maximum 3 active bookings allowed." },
          { status: 409 }
        );
      }
    } catch {
      // RPC may not exist — skip limit check gracefully
    }

    // Get renter profile for currency
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

    // For cash_on_arrival, go directly to "confirmed". Otherwise use "requested" for online payment flow.
    const initialStatus = paymentMethod === "cash_on_arrival" ? "confirmed" : "requested";

    // Create booking
    const { data: booking, error } = await admin
      .from("bookings")
      .insert({
        villa_id: villaId,
        renter_id: user.id,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        guests: guestCount,
        arrival_today: arrivalToday,
        arrival_time: arrivalTime24,
        house_rules_accepted: houseRulesAccepted,
        payment_method: paymentMethod,
        nightly_rate_idr: villa.standby_rate_idr,
        total_amount_idr: totalAmountIdr,
        service_fee_idr: serviceFeeIdr,
        total_charged_idr: totalChargedIdr,
        fx_rate_to_renter: rateRow?.rate_from_idr ?? null,
        renter_currency: renterCurrency,
        status: initialStatus,
      })
      .select()
      .single<Booking>();

    if (error) throw error;

    // Notify owner
    try {
      await admin.from("notifications").insert([
        {
          user_id: villa.owner_id,
          booking_id: booking.id,
          channel: "whatsapp" as const,
          template: initialStatus === "confirmed" ? "booking_confirmed_owner" : "booking_request_owner",
          message_body: initialStatus === "confirmed"
            ? `New confirmed booking from ${profile?.full_name ?? "a renter"} for ${villa.title} (${checkIn} to ${checkOut}). Payment: ${paymentMethod}.`
            : `New booking request from ${profile?.full_name ?? "a renter"} for ${villa.title} (${checkIn} to ${checkOut}). Please approve within 15 minutes.`,
          status: "pending" as const,
        },
        {
          user_id: villa.owner_id,
          booking_id: booking.id,
          channel: "in_app" as const,
          template: initialStatus === "confirmed" ? "booking_confirmed_owner" : "booking_request_owner",
          message_body: initialStatus === "confirmed"
            ? `Confirmed booking for ${villa.title} — ${paymentMethod}.`
            : `New booking request for ${villa.title}.`,
          status: "pending" as const,
        },
      ]);
    } catch {
      // Notifications are non-critical — don't fail the booking
      console.error("Failed to create booking notifications");
    }

    // Read extra villa fields for response
    const { data: villaExtra } = await admin
      .from("villas")
      .select("check_out_time")
      .eq("id", villaId)
      .single();

    const response: BookingResponse = {
      id: booking.id,
      villa_id: booking.villa_id,
      villa_title: villa.title,
      check_in_date: booking.check_in,
      arrival_time: (booking as Record<string, unknown>).arrival_time as string ?? null,
      check_out_date: booking.check_out,
      check_out_time: (villaExtra as Record<string, unknown>)?.check_out_time as string ?? "11:00",
      num_guests: booking.guests,
      nightly_rate: booking.nightly_rate_idr,
      nights: booking.nights,
      total_amount: booking.total_amount_idr,
      service_fee: booking.service_fee_idr,
      total_charged: booking.total_charged_idr,
      payment_method: (booking as Record<string, unknown>).payment_method as string ?? "cash_on_arrival",
      status: booking.status,
      created_at: booking.created_at,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("Create booking error:", err);
    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 }
    );
  }
}
