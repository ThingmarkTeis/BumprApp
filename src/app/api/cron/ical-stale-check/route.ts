import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    // Find active villas with stale iCal sync that aren't already flagged
    const { data: staleVillas, error } = await supabase
      .from("villas")
      .select("id")
      .not("ical_url", "is", null)
      .eq("status", "active")
      .neq("ical_sync_status", "error")
      .or(
        `ical_last_synced_at.is.null,ical_last_synced_at.lt.${twentyFourHoursAgo}`
      );

    if (error) throw error;

    const villaIds = (staleVillas ?? []).map(
      (v: { id: string }) => v.id
    );

    if (villaIds.length > 0) {
      await supabase
        .from("villas")
        .update({ ical_sync_status: "error" })
        .in("id", villaIds);
    }

    return NextResponse.json({ flagged: villaIds.length });
  } catch (err) {
    console.error("iCal stale check cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
