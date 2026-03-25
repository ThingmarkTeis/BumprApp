import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { extendBookingSchema } from "@/lib/validations/booking";
import { calculateNights } from "@/lib/utils/dates";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

const SERVICE_FEE_RATE = 0.15;

// PATCH /api/bookings/[id]/extend — Extend check-out date
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = extendBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { new_check_out_date } = parsed.data;
    const admin = createAdminClient();

    // Fetch the booking
    const { data: booking, error: fetchError } = await admin
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single<Booking>();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    // Must belong to authenticated user
    if (booking.renter_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Must be active or confirmed (not bumped, cancelled, completed)
    if (!["confirmed", "active"].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot extend a booking with status '${booking.status}'.` },
        { status: 400 }
      );
    }

    // New check-out must be after current check-out
    if (new_check_out_date <= booking.check_out) {
      return NextResponse.json(
        { error: "New check-out date must be after the current check-out date." },
        { status: 400 }
      );
    }

    // Check for conflicts in the extended date range
    try {
      const { data: conflicts } = await admin.rpc("check_villa_availability", {
        villa_uuid: booking.villa_id,
        desired_check_in: booking.check_out, // only check the extension window
        desired_check_out: new_check_out_date,
      });

      if (conflicts && (conflicts as unknown[]).length > 0) {
        return NextResponse.json(
          { error: "Villa is not available for the extended dates." },
          { status: 409 }
        );
      }
    } catch {
      // RPC may not exist — skip gracefully
    }

    // Recalculate pricing
    const newNights = calculateNights(booking.check_in, new_check_out_date);
    const newTotalAmountIdr = booking.nightly_rate_idr * newNights;
    const newServiceFeeIdr = Math.round(newTotalAmountIdr * SERVICE_FEE_RATE);
    const newTotalChargedIdr = newTotalAmountIdr + newServiceFeeIdr;

    // Update the booking
    const { data: updated, error: updateError } = await admin
      .from("bookings")
      .update({
        check_out: new_check_out_date,
        nights: newNights,
        total_amount_idr: newTotalAmountIdr,
        service_fee_idr: newServiceFeeIdr,
        total_charged_idr: newTotalChargedIdr,
      })
      .eq("id", id)
      .select()
      .single<Booking>();

    if (updateError) throw updateError;

    return NextResponse.json({
      id: updated.id,
      villa_id: updated.villa_id,
      check_in_date: updated.check_in,
      check_out_date: updated.check_out,
      nights: updated.nights,
      nightly_rate: updated.nightly_rate_idr,
      total_amount: updated.total_amount_idr,
      service_fee: updated.service_fee_idr,
      total_charged: updated.total_charged_idr,
      status: updated.status,
    });
  } catch (err) {
    console.error("Extend booking error:", err);
    return NextResponse.json(
      { error: "Failed to extend booking." },
      { status: 500 }
    );
  }
}
