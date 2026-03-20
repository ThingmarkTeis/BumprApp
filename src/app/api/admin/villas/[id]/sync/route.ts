import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseIcal } from "@/lib/utils/ical-parser";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: villaId } = await params;
    const supabase = createAdminClient();

    const { data: villa } = await supabase
      .from("villas")
      .select("ical_url")
      .eq("id", villaId)
      .single<{ ical_url: string | null }>();

    if (!villa?.ical_url) {
      return NextResponse.json(
        { error: "Villa has no iCal URL." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(villa.ical_url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    const events = parseIcal(content);

    // Determine source
    const source = villa.ical_url.includes("airbnb")
      ? "airbnb"
      : villa.ical_url.includes("booking.com")
        ? "booking_com"
        : "other";

    // Sync
    await supabase
      .from("external_availability")
      .delete()
      .eq("villa_id", villaId);

    if (events.length > 0) {
      await supabase.from("external_availability").insert(
        events.map((e) => ({
          villa_id: villaId,
          source,
          blocked_start: e.start,
          blocked_end: e.end,
          summary: e.summary,
          synced_at: new Date().toISOString(),
        }))
      );
    }

    await supabase
      .from("villas")
      .update({
        ical_last_synced_at: new Date().toISOString(),
        ical_sync_status: "ok",
      })
      .eq("id", villaId);

    return NextResponse.json({ events: events.length });
  } catch (err) {
    console.error("Sync error:", err);
    const { id: villaId } = await params;
    const supabase = createAdminClient();
    await supabase
      .from("villas")
      .update({ ical_sync_status: "error" })
      .eq("id", villaId);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed." },
      { status: 500 }
    );
  }
}
