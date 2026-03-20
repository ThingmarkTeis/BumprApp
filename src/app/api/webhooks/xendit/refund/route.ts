import { NextResponse } from "next/server";
import { verifyXenditWebhook } from "@/lib/integrations/xendit/verify-webhook";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!verifyXenditWebhook(request)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const status = (body.status as string)?.toUpperCase();
    const xenditRefundId = body.id as string;

    if (!xenditRefundId || !status) {
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    if (status === "COMPLETED") {
      await supabase
        .from("payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("xendit_payment_id", xenditRefundId)
        .eq("type", "refund");
    } else if (status === "FAILED") {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          xendit_status: "FAILED",
        })
        .eq("xendit_payment_id", xenditRefundId)
        .eq("type", "refund");
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Xendit refund webhook error:", err);
    return NextResponse.json({ received: true });
  }
}
