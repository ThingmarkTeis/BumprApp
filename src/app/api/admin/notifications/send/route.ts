import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/notifications/send — Admin sends a notification to a user
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { user_id, channel, message, booking_id, bump_id } = body;

    if (!user_id || !channel || !message) {
      return NextResponse.json(
        { error: "user_id, channel, and message are required" },
        { status: 400 }
      );
    }

    if (!["in_app", "whatsapp", "email"].includes(channel)) {
      return NextResponse.json(
        { error: "channel must be in_app, whatsapp, or email" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify user exists
    const { data: user } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", user_id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create the notification
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        booking_id: booking_id || null,
        bump_id: bump_id || null,
        channel,
        template: "admin_manual",
        message_body: message,
        status: channel === "in_app" ? "delivered" : "pending",
        sent_at: channel === "in_app" ? new Date().toISOString() : null,
        delivered_at: channel === "in_app" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: For WhatsApp, trigger Twilio send here
    // TODO: For email, trigger email send here
    // For now, in_app notifications are delivered immediately via Supabase Realtime

    return NextResponse.json({ sent: true, id: (notification as { id: string }).id });
  } catch (err) {
    console.error("Send notification error:", err);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
