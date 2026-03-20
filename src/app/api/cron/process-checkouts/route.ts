import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateCheckoutFinancials } from "@/lib/services/payments";
import { processOwnerPayout } from "@/lib/integrations/xendit/flows";
import type { Database } from "@/lib/supabase/types";

type Payout = Database["public"]["Tables"]["payouts"]["Row"];

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

// Bali date (UTC+8)
function getBaliDateString(): string {
  const now = new Date();
  const baliOffset = 8 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const bali = new Date(utcMs + baliOffset * 60 * 1000);
  return bali.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const today = getBaliDateString();

    // Find active bookings past checkout with no active bumps
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "active")
      .lte("check_out", today)
      .returns<Booking[]>();

    if (error) throw error;

    let processedCount = 0;

    for (const booking of bookings ?? []) {
      try {
        // Check no active bump exists for this booking
        const { data: activeBumps } = await supabase
          .from("bumps")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("status", "active")
          .limit(1);

        if (activeBumps && activeBumps.length > 0) continue;

        // Complete the booking
        await supabase
          .from("bookings")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        // Calculate financials and create payout
        const financials = calculateCheckoutFinancials(booking);

        // Get villa owner
        const { data: villa } = await supabase
          .from("villas")
          .select("owner_id")
          .eq("id", booking.villa_id)
          .single<{ owner_id: string }>();

        if (villa) {
          const { data: payout } = await supabase
            .from("payouts")
            .insert({
              owner_id: villa.owner_id,
              booking_id: booking.id,
              amount_idr: financials.ownerPayoutIdr,
              nights_paid: booking.nights,
              status: "pending",
            })
            .select()
            .single<Payout>();

          // Initiate Xendit disbursement
          if (payout) {
            try {
              await processOwnerPayout(payout.id);
            } catch (xenditErr) {
              console.error(
                `Xendit payout failed for ${payout.id}, will retry:`,
                xenditErr
              );
            }
          }
        }

        processedCount++;
      } catch (err) {
        console.error(
          `Failed to process checkout for booking ${booking.id}:`,
          err
        );
      }
    }

    return NextResponse.json({ processedCheckouts: processedCount });
  } catch (err) {
    console.error("Process checkouts cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
