import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select("status")
      .eq("id", id)
      .single<{ status: string }>();

    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!["active", "bumped"].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot complete a '${booking.status}' booking.` },
        { status: 400 }
      );
    }

    await supabase
      .from("bookings")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ completed: true });
  } catch (err) {
    console.error("Admin complete error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
