import { NextResponse } from "next/server";
import { verifyXenditWebhook } from "@/lib/integrations/xendit/verify-webhook";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];

export async function POST(request: Request) {
  if (!verifyXenditWebhook(request)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const bookingId = body.external_id as string;
    const status = (body.status as string)?.toUpperCase();
    const xenditId = body.id as string;

    if (!bookingId || !status) {
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    // Find the charge payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("type", "charge")
      .in("status", ["pending", "processing"])
      .single<{ id: string }>();

    if (status === "PAID" || status === "SETTLED") {
      // Update payment to completed
      if (payment) {
        await supabase
          .from("payments")
          .update({
            status: "completed",
            xendit_payment_id: xenditId,
            xendit_status: status,
            completed_at: new Date().toISOString(),
          })
          .eq("id", payment.id);
      }

      // Confirm the booking: approved → confirmed
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single<Booking>();

      if (booking && booking.status === "approved") {
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId);

        // Get villa for notifications
        const { data: villa } = await supabase
          .from("villas")
          .select("*")
          .eq("id", booking.villa_id)
          .single<Villa>();

        if (villa) {
          // Create confirmation notifications
          await supabase.from("notifications").insert([
            {
              user_id: booking.renter_id,
              booking_id: bookingId,
              channel: "whatsapp" as const,
              template: "booking_confirmed_renter",
              message_body: `Your booking for ${villa.title} is confirmed! Check-in: ${booking.check_in}. Check-out: ${booking.check_out}.`,
              status: "pending" as const,
            },
            {
              user_id: booking.renter_id,
              booking_id: bookingId,
              channel: "in_app" as const,
              template: "booking_confirmed_renter",
              message_body: `Booking confirmed for ${villa.title}.`,
              status: "pending" as const,
            },
            {
              user_id: villa.owner_id,
              booking_id: bookingId,
              channel: "whatsapp" as const,
              template: "booking_confirmed_owner",
              message_body: `Booking confirmed for ${villa.title}. Guest arrives ${booking.check_in}.`,
              status: "pending" as const,
            },
            {
              user_id: villa.owner_id,
              booking_id: bookingId,
              channel: "in_app" as const,
              template: "booking_confirmed_owner",
              message_body: `Booking confirmed for ${villa.title}.`,
              status: "pending" as const,
            },
          ]);
        }
      }
    } else if (status === "EXPIRED" || status === "FAILED") {
      // Update payment to failed — booking stays approved, renter can retry
      if (payment) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            xendit_payment_id: xenditId,
            xendit_status: status,
          })
          .eq("id", payment.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Xendit payment webhook error:", err);
    return NextResponse.json({ received: true });
  }
}
