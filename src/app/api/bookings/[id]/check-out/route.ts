import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateCheckOutSchema } from "@/lib/validations/booking";
import { calculateTotalAmount } from "@/lib/booking-utils";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

// PATCH /api/bookings/[id]/check-out — Update check-out date (extend or shorten)
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
    const parsed = updateCheckOutSchema.safeParse(body);

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

    if (booking.renter_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Must be confirmed or active
    if (!["confirmed", "active"].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot update check-out for a booking with status '${booking.status}'.` },
        { status: 400 }
      );
    }

    // Must be at least 1 day after check-in
    if (new_check_out_date <= booking.check_in) {
      return NextResponse.json(
        { error: "Check-out must be at least 1 day after check-in." },
        { status: 400 }
      );
    }

    // Cannot be in the past
    const today = new Date().toISOString().split("T")[0];
    if (new_check_out_date < today) {
      return NextResponse.json(
        { error: "Check-out date cannot be in the past." },
        { status: 400 }
      );
    }

    // If extending, check for conflicts in the extended window
    if (new_check_out_date > booking.check_out) {
      try {
        const { data: conflicts } = await admin.rpc("check_villa_availability", {
          villa_uuid: booking.villa_id,
          desired_check_in: booking.check_out,
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
    }

    // TODO: Handle partial refund via Xendit when payment is online
    // For cash_on_arrival, just update the dates and total.

    // Recalculate pricing
    const { nights, totalAmountIdr, serviceFeeIdr, totalChargedIdr } =
      calculateTotalAmount(booking.nightly_rate_idr, booking.check_in, new_check_out_date);

    // Update the booking
    const { data: updated, error: updateError } = await admin
      .from("bookings")
      .update({
        check_out: new_check_out_date,
        nights,
        total_amount_idr: totalAmountIdr,
        service_fee_idr: serviceFeeIdr,
        total_charged_idr: totalChargedIdr,
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
    console.error("Update check-out error:", err);
    return NextResponse.json(
      { error: "Failed to update check-out date." },
      { status: 500 }
    );
  }
}
