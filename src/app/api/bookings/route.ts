import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import type { BookingResponse, BookingListResponse, BookingSummary } from "@/types/booking";
import { createBookingSchema } from "@/lib/validations/booking";
import { calculateNights } from "@/lib/utils/dates";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const BUMP_NOTICE_HOURS = 18;

// GET /api/bookings — List all bookings for the authenticated renter, grouped by category
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch all bookings for this renter
    const { data: bookings, error } = await admin
      .from("bookings")
      .select("*")
      .eq("renter_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Booking[]>();

    if (error) throw error;

    // Get villa details for all bookings
    const villaIds = [...new Set((bookings ?? []).map((b) => b.villa_id))];
    const villaMap = new Map<string, { title: string; area: string }>();
    const photoMap = new Map<string, string>(); // villa_id -> first photo URL

    if (villaIds.length > 0) {
      const { data: villas } = await admin
        .from("villas")
        .select("id, title, area")
        .in("id", villaIds);

      for (const v of villas ?? []) {
        villaMap.set(v.id, { title: v.title, area: v.area });
      }

      const { data: photos } = await admin
        .from("villa_photos")
        .select("villa_id, url")
        .in("villa_id", villaIds)
        .order("sort_order", { ascending: true });

      for (const p of photos ?? []) {
        if (!photoMap.has(p.villa_id)) {
          photoMap.set(p.villa_id, p.url);
        }
      }
    }

    const toSummary = (b: Booking): BookingSummary => {
      const villa = villaMap.get(b.villa_id);
      let mustLeaveBy: string | null = null;

      if (b.status === "bumping" && b.bumped_at) {
        mustLeaveBy = new Date(
          new Date(b.bumped_at).getTime() + BUMP_NOTICE_HOURS * 60 * 60 * 1000
        ).toISOString();
      } else if (b.auto_bump_scheduled_at) {
        mustLeaveBy = new Date(
          new Date(b.auto_bump_scheduled_at).getTime() + BUMP_NOTICE_HOURS * 60 * 60 * 1000
        ).toISOString();
      }

      return {
        id: b.id,
        villa_title: villa?.title ?? "Unknown Villa",
        villa_image: photoMap.get(b.villa_id) ?? "",
        area: villa?.area ?? "",
        check_in_date: b.check_in,
        check_out_date: b.check_out,
        status: b.status,
        standby_rate: b.nightly_rate_idr,
        auto_bump_fires_at: b.auto_bump_scheduled_at,
        bumped_at: b.bumped_at,
        must_leave_by: mustLeaveBy,
      };
    };

    const active: BookingSummary[] = [];
    const bumping: BookingSummary[] = [];
    const past: BookingSummary[] = [];

    for (const b of bookings ?? []) {
      const summary = toSummary(b);
      if (b.status === "confirmed" || b.status === "active") {
        active.push(summary);
      } else if (b.status === "bumping") {
        bumping.push(summary);
      } else if (["bumped", "completed", "cancelled", "expired", "pre_checkin_cancelled"].includes(b.status)) {
        past.push(summary);
      }
      // requested/approved are not shown in these categories
    }

    const response: BookingListResponse = { active, bumping, past };
    return NextResponse.json(response);
  } catch (err) {
    logger.error("List bookings error", { action: "GET /api/bookings", context: { error: err instanceof Error ? err.message : String(err) } });
    return NextResponse.json(
      { error: "Failed to fetch bookings." },
      { status: 500 }
    );
  }
}

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

    // Check for overlapping confirmed/active bookings by OTHER renters
    const { data: occupiedConflicts } = await admin
      .from("bookings")
      .select("id")
      .eq("villa_id", villaId)
      .neq("renter_id", user.id)
      .in("status", ["confirmed", "active"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn)
      .limit(1);

    if (occupiedConflicts && occupiedConflicts.length > 0) {
      return NextResponse.json(
        { error: "Villa is not available for the selected dates." },
        { status: 409 }
      );
    }

    // Check external availability blocks (iCal / manual owner blocks)
    const { data: externalBlocks } = await admin
      .from("external_availability")
      .select("id")
      .eq("villa_id", villaId)
      .lt("blocked_start", checkOut)
      .gt("blocked_end", checkIn)
      .limit(1);

    if (externalBlocks && externalBlocks.length > 0) {
      return NextResponse.json(
        { error: "Villa is not available for the selected dates." },
        { status: 409 }
      );
    }

    // Check max 2 active bookings per renter
    const { data: activeBookings } = await admin
      .from("bookings")
      .select("id")
      .eq("renter_id", user.id)
      .in("status", ["confirmed", "active"])
      .limit(3);

    if (activeBookings && activeBookings.length >= 2) {
      return NextResponse.json(
        { error: "max_bookings_reached", message: "You can have a maximum of 2 active bookings." },
        { status: 400 }
      );
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
    const serviceFeeRate = (villa.service_fee_percentage ?? 15) / 100;
    const serviceFeeIdr = Math.round(totalAmountIdr * serviceFeeRate);
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
    logger.error("Create booking error", { action: "POST /api/bookings", context: { error: err instanceof Error ? err.message : String(err) } });
    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 }
    );
  }
}
