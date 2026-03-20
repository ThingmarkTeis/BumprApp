import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ExternalAvailability =
  Database["public"]["Tables"]["external_availability"]["Row"];

export async function syncExternalAvailability(
  villaId: string,
  events: {
    source: string;
    blockedStart: string;
    blockedEnd: string;
    summary?: string;
  }[]
): Promise<void> {
  const supabase = await createClient();

  // Delete existing records for this villa
  const { error: deleteError } = await supabase
    .from("external_availability")
    .delete()
    .eq("villa_id", villaId);

  if (deleteError)
    throw new Error(`Failed to clear availability: ${deleteError.message}`);

  // Insert new records (skip if empty)
  if (events.length > 0) {
    const rows = events.map((e) => ({
      villa_id: villaId,
      source: e.source,
      blocked_start: e.blockedStart,
      blocked_end: e.blockedEnd,
      summary: e.summary ?? null,
      synced_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("external_availability")
      .insert(rows);

    if (insertError)
      throw new Error(`Failed to insert availability: ${insertError.message}`);
  }

  // Update villa sync status
  await supabase
    .from("villas")
    .update({
      ical_last_synced_at: new Date().toISOString(),
      ical_sync_status: "ok",
    })
    .eq("id", villaId);
}

export async function getExternalAvailability(
  villaId: string
): Promise<ExternalAvailability[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("external_availability")
    .select("*")
    .eq("villa_id", villaId)
    .order("blocked_start", { ascending: true })
    .returns<ExternalAvailability[]>();

  if (error) throw new Error(`Failed to fetch availability: ${error.message}`);
  return data ?? [];
}

export async function verifyExternalBooking(
  villaId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check if there's an external blocked period overlapping the given dates
  const { data, error } = await supabase
    .from("external_availability")
    .select("id")
    .eq("villa_id", villaId)
    .lt("blocked_start", checkOut)
    .gt("blocked_end", checkIn)
    .limit(1)
    .returns<{ id: string }[]>();

  if (error) throw new Error(`Failed to verify booking: ${error.message}`);
  return (data ?? []).length > 0;
}
