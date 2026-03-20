import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/verify-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseIcal } from "@/lib/utils/ical-parser";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type Bump = Database["public"]["Tables"]["bumps"]["Row"];

interface SyncError {
  villaId: string;
  error: string;
}

function guessSource(url: string): string {
  if (url.includes("airbnb")) return "airbnb";
  if (url.includes("booking.com")) return "booking_com";
  return "other";
}

async function fetchIcalContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Fetch all villas with iCal URLs
    const { data: villas, error } = await supabase
      .from("villas")
      .select("*")
      .in("status", ["active", "paused"])
      .not("ical_url", "is", null)
      .returns<Villa[]>();

    if (error) throw error;

    let syncedCount = 0;
    let failedCount = 0;
    const errors: SyncError[] = [];

    for (const villa of villas ?? []) {
      try {
        if (!villa.ical_url) continue;

        // Fetch and parse iCal
        const content = await fetchIcalContent(villa.ical_url);
        const source = guessSource(villa.ical_url);
        const icalEvents = parseIcal(content);

        // Delete existing records and insert new ones
        await supabase
          .from("external_availability")
          .delete()
          .eq("villa_id", villa.id);

        if (icalEvents.length > 0) {
          const rows = icalEvents.map((e) => ({
            villa_id: villa.id,
            source,
            blocked_start: e.start,
            blocked_end: e.end,
            summary: e.summary,
            synced_at: new Date().toISOString(),
          }));

          await supabase.from("external_availability").insert(rows);
        }

        // Update villa sync status
        await supabase
          .from("villas")
          .update({
            ical_last_synced_at: new Date().toISOString(),
            ical_sync_status: "ok",
          })
          .eq("id", villa.id);

        // Check for bump verification on this villa
        const { data: unverifiedBumps } = await supabase
          .from("bumps")
          .select("*")
          .eq("villa_id", villa.id)
          .eq("status", "active")
          .eq("ical_verified", false)
          .returns<Bump[]>();

        for (const bump of unverifiedBumps ?? []) {
          // Get the booking dates
          const { data: booking } = await supabase
            .from("bookings")
            .select("check_in, check_out")
            .eq("id", bump.booking_id)
            .single<{ check_in: string; check_out: string }>();

          if (!booking) continue;

          // Check if external availability overlaps the booking
          const { data: overlaps } = await supabase
            .from("external_availability")
            .select("id")
            .eq("villa_id", villa.id)
            .lt("blocked_start", booking.check_out)
            .gt("blocked_end", booking.check_in)
            .limit(1);

          if (overlaps && overlaps.length > 0) {
            await supabase
              .from("bumps")
              .update({
                ical_verified: true,
                ical_verified_at: new Date().toISOString(),
              })
              .eq("id", bump.id);
          }
        }

        syncedCount++;
      } catch (err) {
        failedCount++;
        errors.push({
          villaId: villa.id,
          error: err instanceof Error ? err.message : String(err),
        });

        // Mark sync as error but don't crash the batch
        await supabase
          .from("villas")
          .update({ ical_sync_status: "error" })
          .eq("id", villa.id);
      }
    }

    return NextResponse.json({
      synced: syncedCount,
      failed: failedCount,
      errors,
    });
  } catch (err) {
    console.error("iCal sync cron error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
