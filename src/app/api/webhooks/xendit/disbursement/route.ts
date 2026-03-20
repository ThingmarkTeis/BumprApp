import { NextResponse } from "next/server";
import { verifyXenditWebhook } from "@/lib/integrations/xendit/verify-webhook";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Payout = Database["public"]["Tables"]["payouts"]["Row"];
type Villa = Database["public"]["Tables"]["villas"]["Row"];

export async function POST(request: Request) {
  if (!verifyXenditWebhook(request)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const status = (body.status as string)?.toUpperCase();
    const xenditDisbursementId = body.id as string;
    const externalId = body.external_id as string; // This is our payoutId

    if (!externalId || !status) {
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    if (status === "COMPLETED") {
      await supabase
        .from("payouts")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", externalId);

      // Send payout notification to owner
      const { data: payout } = await supabase
        .from("payouts")
        .select("*")
        .eq("id", externalId)
        .single<Payout>();

      if (payout) {
        const { data: booking } = await supabase
          .from("bookings")
          .select("villa_id")
          .eq("id", payout.booking_id)
          .single<{ villa_id: string }>();

        const { data: villa } = booking
          ? await supabase
              .from("villas")
              .select("title")
              .eq("id", booking.villa_id)
              .single<Pick<Villa, "title">>()
          : { data: null };

        await supabase.from("notifications").insert([
          {
            user_id: payout.owner_id,
            booking_id: payout.booking_id,
            channel: "whatsapp" as const,
            template: "payout_completed_owner",
            message_body: `Payout of Rp ${payout.amount_idr.toLocaleString("id-ID")} for ${villa?.title ?? "your villa"} (${payout.nights_paid} nights) has been sent.`,
            status: "pending" as const,
          },
          {
            user_id: payout.owner_id,
            booking_id: payout.booking_id,
            channel: "in_app" as const,
            template: "payout_completed_owner",
            message_body: `Payout of Rp ${payout.amount_idr.toLocaleString("id-ID")} sent to your bank.`,
            status: "pending" as const,
          },
        ]);
      }
    } else if (status === "FAILED") {
      await supabase
        .from("payouts")
        .update({
          status: "failed",
          xendit_disbursement_id: xenditDisbursementId,
        })
        .eq("id", externalId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Xendit disbursement webhook error:", err);
    return NextResponse.json({ received: true });
  }
}
