import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateNights } from "@/lib/utils/dates";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: bump } = await supabase
      .from("bumps")
      .select("*, bookings(*)")
      .eq("id", id)
      .single();

    if (!bump) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (bump.status === "resolved") {
      return NextResponse.json({ error: "Already resolved." }, { status: 400 });
    }

    const booking = (bump as Record<string, unknown>).bookings as {
      check_in: string;
      nights: number;
      id: string;
    };
    const deadlineDate = (bump.deadline as string).split("T")[0];
    const nightsStayed = Math.max(1, calculateNights(booking.check_in, deadlineDate));

    await supabase
      .from("bumps")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        nights_stayed: nightsStayed,
        nights_refunded: booking.nights - nightsStayed,
      })
      .eq("id", id);

    await supabase
      .from("bookings")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", booking.id);

    return NextResponse.json({ resolved: true });
  } catch (err) {
    console.error("Resolve bump error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
