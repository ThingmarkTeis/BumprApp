import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canBump } from "@/lib/services/protection";
import { formatDeadline } from "@/lib/utils/dates";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Bump = Database["public"]["Tables"]["bumps"]["Row"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: villaId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, externalPlatform } = body as {
      bookingId: string;
      externalPlatform: string;
    };

    if (!bookingId || !externalPlatform) {
      return NextResponse.json(
        { error: "bookingId and externalPlatform are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify owner
    const { data: villa } = await admin
      .from("villas")
      .select("*")
      .eq("id", villaId)
      .single<Villa>();

    if (!villa || villa.owner_id !== user.id) {
      return NextResponse.json(
        { error: "You do not own this villa." },
        { status: 403 }
      );
    }

    // Get booking
    const { data: booking } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single<Booking>();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.villa_id !== villaId) {
      return NextResponse.json(
        { error: "Booking does not belong to this villa." },
        { status: 400 }
      );
    }

    // Validate bump
    const bumpCheck = canBump(booking);
    if (!bumpCheck.allowed) {
      return NextResponse.json({ error: bumpCheck.reason }, { status: 400 });
    }

    // Check no existing active bump
    const { data: existingBumps } = await admin
      .from("bumps")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("status", "active")
      .limit(1);

    if (existingBumps && existingBumps.length > 0) {
      return NextResponse.json(
        { error: "An active bump already exists for this booking." },
        { status: 409 }
      );
    }

    // Calculate deadline
    const now = new Date();
    const deadline = new Date(
      now.getTime() + villa.bump_notice_hours * 60 * 60 * 1000
    );

    // Create bump
    const { data: bump, error } = await admin
      .from("bumps")
      .insert({
        booking_id: bookingId,
        villa_id: villaId,
        owner_id: user.id,
        renter_id: booking.renter_id,
        triggered_at: now.toISOString(),
        external_platform: externalPlatform,
        deadline: deadline.toISOString(),
        status: "active",
      })
      .select()
      .single<Bump>();

    if (error) throw error;

    // Update booking status
    await admin
      .from("bookings")
      .update({ status: "bumped" })
      .eq("id", bookingId);

    // Get renter name for notification
    const { data: renter } = await admin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", booking.renter_id)
      .single<{ full_name: string; phone: string | null }>();

    const deadlineStr = formatDeadline(deadline);

    // Create notifications for bump
    await admin.from("notifications").insert([
      // CRITICAL: WhatsApp to renter
      {
        user_id: booking.renter_id,
        booking_id: bookingId,
        bump_id: bump.id,
        channel: "whatsapp" as const,
        template: "bump_alert_renter",
        message_body: `You've been bumped from ${villa.title}. A full-price booking came in via ${externalPlatform}. You have until ${deadlineStr} to leave.`,
        status: "pending" as const,
      },
      // In-app to renter
      {
        user_id: booking.renter_id,
        booking_id: bookingId,
        bump_id: bump.id,
        channel: "in_app" as const,
        template: "bump_alert_renter",
        message_body: `You've been bumped from ${villa.title}. Deadline: ${deadlineStr}.`,
        status: "pending" as const,
      },
      // WhatsApp to owner (confirmation)
      {
        user_id: user.id,
        booking_id: bookingId,
        bump_id: bump.id,
        channel: "whatsapp" as const,
        template: "bump_confirmed_owner",
        message_body: `Bump triggered on ${villa.title}. ${renter?.full_name ?? "Guest"} has been notified and must leave by ${deadlineStr}.`,
        status: "pending" as const,
      },
      // In-app to owner
      {
        user_id: user.id,
        booking_id: bookingId,
        bump_id: bump.id,
        channel: "in_app" as const,
        template: "bump_confirmed_owner",
        message_body: `Bump triggered on ${villa.title}.`,
        status: "pending" as const,
      },
    ]);

    return NextResponse.json(bump, { status: 201 });
  } catch (err) {
    console.error("Bump trigger error:", err);
    return NextResponse.json(
      { error: "Failed to trigger bump." },
      { status: 500 }
    );
  }
}
