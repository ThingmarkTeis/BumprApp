import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { processRefund, processOwnerPayout } from "@/lib/integrations/xendit/flows";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Check if it's a payment or payout
    const { data: payment } = await supabase
      .from("payments")
      .select("id, type, booking_id, status")
      .eq("id", id)
      .single<{ id: string; type: string; booking_id: string; status: string }>();

    if (payment) {
      if (payment.status !== "failed" && payment.status !== "pending") {
        return NextResponse.json(
          { error: "Only failed or pending records can be retried." },
          { status: 400 }
        );
      }

      if (payment.type === "refund") {
        // Find the bump for this booking
        const { data: bump } = await supabase
          .from("bumps")
          .select("id")
          .eq("booking_id", payment.booking_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single<{ id: string }>();

        if (bump) {
          await processRefund(payment.booking_id, bump.id);
        }
      }
      return NextResponse.json({ retried: true });
    }

    // Try as payout
    const { data: payout } = await supabase
      .from("payouts")
      .select("id, status")
      .eq("id", id)
      .single<{ id: string; status: string }>();

    if (payout) {
      if (payout.status !== "failed" && payout.status !== "pending") {
        return NextResponse.json(
          { error: "Only failed or pending records can be retried." },
          { status: 400 }
        );
      }
      await processOwnerPayout(id);
      return NextResponse.json({ retried: true });
    }

    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  } catch (err) {
    console.error("Retry payment error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
