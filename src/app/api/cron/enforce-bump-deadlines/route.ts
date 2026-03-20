import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateBumpFinancials } from "@/lib/services/payments";
import { calculateNights } from "@/lib/utils/dates";
import { processRefund, processOwnerPayout } from "@/lib/integrations/xendit/flows";
import type { Database } from "@/lib/supabase/types";

type Bump = Database["public"]["Tables"]["bumps"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type Payout = Database["public"]["Tables"]["payouts"]["Row"];

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const now = new Date().toISOString();

    // Find active bumps past their deadline
    const { data: bumps, error } = await supabase
      .from("bumps")
      .select("*")
      .eq("status", "active")
      .lte("deadline", now)
      .returns<Bump[]>();

    if (error) throw error;

    let enforcedCount = 0;

    for (const bump of bumps ?? []) {
      try {
        // Get the booking
        const { data: booking } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bump.booking_id)
          .single<Booking>();

        if (!booking) continue;

        // Calculate nights stayed: check_in date to bump deadline date
        const deadlineDate = bump.deadline.split("T")[0];
        const nightsStayed = Math.max(
          1,
          calculateNights(booking.check_in, deadlineDate)
        );
        const nightsRefunded = booking.nights - nightsStayed;

        // Resolve the bump
        await supabase
          .from("bumps")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            nights_stayed: nightsStayed,
            nights_refunded: nightsRefunded,
          })
          .eq("id", bump.id);

        // Complete the booking
        await supabase
          .from("bookings")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        // Calculate financials
        const financials = calculateBumpFinancials(booking, nightsStayed);

        // Get villa owner
        const { data: villa } = await supabase
          .from("villas")
          .select("owner_id")
          .eq("id", booking.villa_id)
          .single<{ owner_id: string }>();

        if (villa) {
          // Create payout record for owner
          const { data: payout } = await supabase
            .from("payouts")
            .insert({
              owner_id: villa.owner_id,
              booking_id: booking.id,
              amount_idr: financials.ownerPayoutIdr,
              nights_paid: nightsStayed,
              status: "pending",
            })
            .select()
            .single<Payout>();

          // Initiate Xendit disbursement
          if (payout) {
            try {
              await processOwnerPayout(payout.id);
            } catch (xenditErr) {
              console.error(`Xendit payout failed for ${payout.id}:`, xenditErr);
            }
          }
        }

        // Create refund record for renter (if there are unused nights)
        if (financials.renterRefundIdr > 0) {
          await supabase.from("payments").insert({
            booking_id: booking.id,
            type: "refund" as const,
            amount_idr: financials.renterRefundIdr,
            description: `Bump refund: ${nightsRefunded} unused nights + service fee`,
            status: "pending" as const,
          });

          // Initiate Xendit refund
          try {
            await processRefund(booking.id, bump.id);
          } catch (xenditErr) {
            console.error(`Xendit refund failed for booking ${booking.id}:`, xenditErr);
          }
        }

        enforcedCount++;
      } catch (err) {
        console.error(
          `Failed to enforce bump deadline ${bump.id}:`,
          err
        );
      }
    }

    return NextResponse.json({ enforcedDeadlines: enforcedCount });
  } catch (err) {
    console.error("Enforce bump deadlines cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
