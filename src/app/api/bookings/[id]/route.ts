import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateProtectionStatus } from "@/lib/booking-utils";
import type { BookingDetail } from "@/types/booking";

const BUMP_NOTICE_HOURS = 18;

// GET /api/bookings/[id] — Full booking detail for renter
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const admin = createAdminClient();

    // Fetch booking
    const { data: booking, error } = await admin
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.renter_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch villa with owner info
    const { data: villa } = await admin
      .from("villas")
      .select("id, title, area, address, location, check_out_time, house_rules, owner_id")
      .eq("id", booking.villa_id)
      .single();

    if (!villa) {
      return NextResponse.json({ error: "Villa not found." }, { status: 404 });
    }

    // Owner profile
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", villa.owner_id)
      .single<{ id: string; full_name: string; avatar_url: string | null }>();

    // Villa photos
    const { data: photos } = await admin
      .from("villa_photos")
      .select("url, caption")
      .eq("villa_id", villa.id)
      .order("sort_order", { ascending: true });

    // Parse location coordinates
    let lat: number | null = null;
    let lng: number | null = null;
    if (typeof villa.location === "string" && villa.location.length >= 42) {
      try {
        const buf = Buffer.from(villa.location, "hex");
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
        // Skip unparseable locations
      }
    }

    // Check for active bump
    const { data: activeBump } = await admin
      .from("bumps")
      .select("triggered_at, deadline, status")
      .eq("booking_id", id)
      .eq("status", "active")
      .order("triggered_at", { ascending: false })
      .limit(1)
      .single();

    // Protection status
    const protection = calculateProtectionStatus({
      check_in: booking.check_in,
      arrival_time: booking.arrival_time,
      status: booking.status,
    });

    // Bump info
    const bump = activeBump
      ? {
          is_bumped: true,
          bumped_at: activeBump.triggered_at,
          must_leave_by: activeBump.deadline,
        }
      : booking.status === "bumped"
        ? { is_bumped: true, bumped_at: null, must_leave_by: null }
        : null;

    const response: BookingDetail = {
      id: booking.id,
      villa: {
        id: villa.id,
        title: villa.title,
        images: (photos ?? []).map((p: { url: string; caption: string | null }) => ({
          url: p.url,
          alt: p.caption ?? villa.title,
        })),
        location: {
          lat,
          lng,
          address: villa.address,
          area: villa.area,
        },
        house_rules: villa.house_rules,
        check_out_time: villa.check_out_time ?? "11:00",
        owner: {
          id: villa.owner_id,
          display_name: ownerProfile?.full_name ?? "Villa Owner",
          avatar_url: ownerProfile?.avatar_url ?? null,
        },
      },
      check_in_date: booking.check_in,
      arrival_time: booking.arrival_time,
      check_out_date: booking.check_out,
      num_guests: booking.guests,
      nights: booking.nights,
      standby_rate: booking.nightly_rate_idr,
      total_amount: booking.total_amount_idr,
      service_fee: booking.service_fee_idr,
      total_charged: booking.total_charged_idr,
      payment_method: booking.payment_method ?? "cash_on_arrival",
      status: booking.status,
      protection,
      bump,
      created_at: booking.created_at,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Get booking detail error:", err);
    return NextResponse.json({ error: "Failed to fetch booking." }, { status: 500 });
  }
}
