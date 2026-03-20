import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateRequest } from "twilio";

export async function POST(request: Request) {
  // Validate Twilio signature
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const url = request.url;
    const body = await request.clone().text();
    const params: Record<string, string> = {};
    new URLSearchParams(body).forEach((v, k) => {
      params[k] = v;
    });

    if (!validateRequest(authToken, signature, url, params)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const formData = await request.formData();
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = (formData.get("MessageStatus") as string)?.toLowerCase();

    if (!messageSid || !messageStatus) {
      return NextResponse.json({ received: true });
    }

    const supabase = createAdminClient();

    const updates: Record<string, unknown> = {};

    switch (messageStatus) {
      case "sent":
        updates.status = "sent";
        updates.sent_at = new Date().toISOString();
        break;
      case "delivered":
        updates.status = "delivered";
        updates.delivered_at = new Date().toISOString();
        break;
      case "read":
        updates.status = "read";
        break;
      case "failed":
      case "undelivered": {
        updates.status = "failed";
        updates.error_message = formData.get("ErrorMessage") as string ?? messageStatus;

        // Check if this was a critical bump alert
        const { data: notification } = await supabase
          .from("notifications")
          .select("template")
          .eq("twilio_message_sid", messageSid)
          .single<{ template: string }>();

        if (notification?.template === "bump_alert_renter") {
          console.error(
            `CRITICAL: Bump alert WhatsApp delivery failed for message ${messageSid}`
          );
        }
        break;
      }
      default:
        return NextResponse.json({ received: true });
    }

    await supabase
      .from("notifications")
      .update(updates)
      .eq("twilio_message_sid", messageSid);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Twilio status webhook error:", err);
    return NextResponse.json({ received: true });
  }
}
