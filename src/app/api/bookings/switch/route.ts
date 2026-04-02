import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { switchVillaSchema } from "@/lib/validations/booking";
import { calculateNights } from "@/lib/utils/dates";
import type { Database } from "@/lib/supabase/types";
import type { SwitchVillaResponse } from "@/types/booking";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const SERVICE_FEE_RATE = 0.15;
const BUMP_NOTICE_HOURS = 18;

export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("[SwitchVilla] Received body:", JSON.stringify(body));
    const parsed = switchVillaSchema.safeParse(body);

    if (!parsed.success) {
      console.log("[SwitchVilla] Validation errors:", JSON.stringify(parsed.error.issues));
      return NextResponse.json(
        { error: parsed.error.issues[0].message, issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const d = parsed.data;

    // Normalize field names (accept both snake_case and camelCase)
    const new_villa_id = (d.new_villa_id ?? d.villaId ?? d.toVillaId)!;
    const switch_from_booking_id = (d.switch_from_booking_id ?? d.switchFromBookingId ?? d.bookingId)!;
    const auto_bump_delay_minutes = (d.auto_bump_delay_minutes ?? d.autoBumpDelayMinutes)!;
    const check_out_date = (d.check_out_date ?? d.checkOutDate)!;
    const arrival_time = (d.arrival_time ?? d.arrivalTime)!;
    const num_guests = (d.num_guests ?? d.guests)!;

    const admin = createAdminClient();

    // 1. Validate switch_from_booking belongs to renter and is confirmed
    const { data: villaABooking, error: villaAError } = await admin
      .from("bookings")
      .select("*")
      .eq("id", switch_from_booking_id)
      .single<Booking>();

    if (villaAError || !villaABooking) {
      return NextResponse.json(
        { error: "Booking to switch from not found." },
        { status: 404 }
      );
    }

    if (villaABooking.renter_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (villaABooking.status !== "confirmed" && villaABooking.status !== "active") {
      return NextResponse.json(
        { error: `Cannot switch from a booking with status '${villaABooking.status}'. Only active bookings can be switched.` },
        { status: 400 }
      );
    }

    // Check if Villa A already has an auto-bump scheduled
    if (villaABooking.auto_bump_scheduled_at) {
      return NextResponse.json(
        { error: "This booking already has a switch in progress." },
        { status: 409 }
      );
    }

    // 2. Check renter doesn't exceed 2 active bookings (excluding the one being switched)
    const { data: activeBookings } = await admin
      .from("bookings")
      .select("id")
      .eq("renter_id", user.id)
      .in("status", ["confirmed", "active"])
      .neq("id", switch_from_booking_id)
      .limit(3);

    if (activeBookings && activeBookings.length >= 2) {
      return NextResponse.json(
        {
          error: "max_bookings_reached",
          message: "You already have 2 other active bookings. Cancel one before switching.",
        },
        { status: 400 }
      );
    }

    // 3. Validate Villa B exists and is active
    const { data: villaB } = await admin
      .from("villas")
      .select("*")
      .eq("id", new_villa_id)
      .single<Villa>();

    if (!villaB || villaB.status !== "active") {
      return NextResponse.json(
        { error: "Villa not found or not active." },
        { status: 404 }
      );
    }

    // 4. Validate guest count
    if (num_guests > villaB.max_guests) {
      return NextResponse.json(
        { error: `Maximum ${villaB.max_guests} guests allowed at this villa.` },
        { status: 400 }
      );
    }

    // 5. Validate check-out date
    const today = new Date().toISOString().split("T")[0];
    if (check_out_date <= today) {
      return NextResponse.json(
        { error: "Check-out date must be in the future." },
        { status: 400 }
      );
    }

    // Villa B check-in is today (switch is immediate)
    const checkInDate = today;
    if (check_out_date <= checkInDate) {
      return NextResponse.json(
        { error: "Check-out must be after check-in." },
        { status: 400 }
      );
    }

    // Normalize arrival time to HH:MM
    let arrivalTime24 = arrival_time;
    const match = arrival_time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = match[2];
      const period = match[3].toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      arrivalTime24 = `${String(h).padStart(2, "0")}:${m}`;
    }

    // Validate arrival time against villa's earliest check-in
    if (villaB.earliest_check_in && arrivalTime24 < villaB.earliest_check_in) {
      return NextResponse.json(
        { error: `Earliest check-in at this villa is ${villaB.earliest_check_in}.` },
        { status: 400 }
      );
    }

    // 6. Check Villa B availability
    const { data: overlapping } = await admin
      .from("bookings")
      .select("id")
      .eq("villa_id", new_villa_id)
      .in("status", ["requested", "approved", "confirmed", "active"])
      .lt("check_in", check_out_date)
      .gt("check_out", checkInDate)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: "Villa B is not available for the selected dates." },
        { status: 409 }
      );
    }

    // Also check iCal availability
    try {
      const { data: conflicts } = await admin.rpc("check_villa_availability", {
        villa_uuid: new_villa_id,
        desired_check_in: checkInDate,
        desired_check_out: check_out_date,
      });
      if (conflicts && (conflicts as unknown[]).length > 0) {
        return NextResponse.json(
          { error: "Villa B is not available for the selected dates." },
          { status: 409 }
        );
      }
    } catch {
      // RPC may not exist yet
    }

    // 7. Get renter profile for currency
    const { data: profile } = await admin
      .from("profiles")
      .select("preferred_currency")
      .eq("id", user.id)
      .single<{ preferred_currency: string }>();

    const renterCurrency = profile?.preferred_currency ?? "USD";

    const { data: rateRow } = await admin
      .from("exchange_rates")
      .select("rate_from_idr")
      .eq("currency_code", renterCurrency)
      .single<{ rate_from_idr: number }>();

    // 8. Calculate pricing for Villa B
    const nights = calculateNights(checkInDate, check_out_date);
    if (nights <= 0) {
      return NextResponse.json(
        { error: "Booking must be at least 1 night." },
        { status: 400 }
      );
    }

    const totalAmountIdr = villaB.standby_rate_idr * nights;
    const serviceFeeIdr = Math.round(totalAmountIdr * SERVICE_FEE_RATE);
    const totalChargedIdr = totalAmountIdr + serviceFeeIdr;

    // 9. Calculate auto-bump fire time
    const now = new Date();
    const autoBumpFiresAt = new Date(
      now.getTime() + auto_bump_delay_minutes * 60 * 1000
    );
    const mustLeaveBy = new Date(
      autoBumpFiresAt.getTime() + BUMP_NOTICE_HOURS * 60 * 60 * 1000
    );

    // 10. Create Villa B booking (confirmed = active)
    const { data: villaBBooking, error: createError } = await admin
      .from("bookings")
      .insert({
        villa_id: new_villa_id,
        renter_id: user.id,
        check_in: checkInDate,
        check_out: check_out_date,
        nights,
        guests: num_guests,
        arrival_time: arrivalTime24,
        house_rules_accepted: true,
        payment_method: "cash_on_arrival",
        nightly_rate_idr: villaB.standby_rate_idr,
        total_amount_idr: totalAmountIdr,
        service_fee_idr: serviceFeeIdr,
        total_charged_idr: totalChargedIdr,
        fx_rate_to_renter: rateRow?.rate_from_idr ?? null,
        renter_currency: renterCurrency,
        status: "confirmed",
        switched_from_booking_id: switch_from_booking_id,
      })
      .select()
      .single<Booking>();

    if (createError || !villaBBooking) {
      throw createError ?? new Error("Failed to create Villa B booking");
    }

    // 11. Schedule auto-bump on Villa A (don't change status yet)
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        auto_bump_scheduled_at: autoBumpFiresAt.toISOString(),
        auto_bump_triggered_by: "switch",
        switched_to_booking_id: villaBBooking.id,
      })
      .eq("id", switch_from_booking_id);

    if (updateError) {
      // Rollback: cancel the Villa B booking
      await admin
        .from("bookings")
        .update({ status: "cancelled", cancelled_at: now.toISOString() })
        .eq("id", villaBBooking.id);
      throw updateError;
    }

    // Get Villa A title for response
    const { data: villaA } = await admin
      .from("villas")
      .select("title")
      .eq("id", villaABooking.villa_id)
      .single<{ title: string }>();

    // Get Villa B photos and owner for response
    const { data: villaBPhotos } = await admin
      .from("villa_photos")
      .select("url, caption")
      .eq("villa_id", new_villa_id)
      .order("sort_order", { ascending: true });

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", villaB.owner_id)
      .single<{ id: string; full_name: string; avatar_url: string | null }>();

    // Parse Villa B location
    let lat: number | null = null;
    let lng: number | null = null;
    if (typeof villaB.location === "string" && (villaB.location as string).length >= 42) {
      try {
        const buf = Buffer.from(villaB.location as string, "hex");
        const le = buf[0] === 1;
        const readDouble = le
          ? (offset: number) => buf.readDoubleLE(offset)
          : (offset: number) => buf.readDoubleBE(offset);
        lng = readDouble(9);
        lat = readDouble(17);
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          lat = null;
          lng = null;
        }
      } catch {
        // Skip unparseable
      }
    }

    const response: SwitchVillaResponse = {
      new_booking: {
        id: villaBBooking.id,
        villa: {
          id: villaB.id,
          title: villaB.title,
          images: (villaBPhotos ?? []).map((p: { url: string; caption: string | null }) => ({
            url: p.url,
            alt: p.caption ?? villaB.title,
          })),
          location: {
            lat,
            lng,
            address: villaB.address,
            area: villaB.area,
          },
          house_rules: villaB.house_rules,
          check_out_time: villaB.check_out_time ?? "11:00",
          owner: {
            id: villaB.owner_id,
            display_name: ownerProfile?.full_name ?? "Villa Owner",
            avatar_url: ownerProfile?.avatar_url ?? null,
          },
        },
        check_in_date: villaBBooking.check_in,
        arrival_time: arrivalTime24,
        check_out_date: villaBBooking.check_out,
        num_guests,
        nights,
        standby_rate: villaB.standby_rate_idr,
        total_amount: totalAmountIdr,
        service_fee: serviceFeeIdr,
        total_charged: totalChargedIdr,
        payment_method: "cash_on_arrival",
        status: "confirmed",
        protection: {
          is_protected: false,
          protected_until: null,
          bump_deadline_if_bumped_now: null,
        },
        bump: null,
        auto_bump: null,
        created_at: villaBBooking.created_at,
      },
      switching_from: {
        booking_id: switch_from_booking_id,
        villa_title: villaA?.title ?? "Unknown Villa",
        auto_bump_fires_at: autoBumpFiresAt.toISOString(),
        must_leave_by: mustLeaveBy.toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("Switch villa error:", err);
    return NextResponse.json(
      { error: "Failed to switch villa." },
      { status: 500 }
    );
  }
}
