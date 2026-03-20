import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];
type VillaPhoto = Database["public"]["Tables"]["villa_photos"]["Row"];
type VillaInsert = Database["public"]["Tables"]["villas"]["Insert"];
type VillaUpdate = Database["public"]["Tables"]["villas"]["Update"];

export async function getVillasByViewport(params: {
  west: number;
  south: number;
  east: number;
  north: number;
  checkIn?: string;
  checkOut?: string;
  area?: string;
  minBedrooms?: number;
  maxPriceIdr?: number;
}): Promise<Villa[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_villas_in_viewport", {
    min_lng: params.west,
    min_lat: params.south,
    max_lng: params.east,
    max_lat: params.north,
  });

  if (error) throw new Error(`Failed to fetch villas: ${error.message}`);

  let villas = (data ?? []) as Villa[];

  // Client-side filters for fields not in the RPC
  if (params.area) {
    villas = villas.filter((v) => v.area === params.area);
  }
  if (params.minBedrooms) {
    villas = villas.filter((v) => v.bedrooms >= params.minBedrooms!);
  }
  if (params.maxPriceIdr) {
    villas = villas.filter((v) => v.standby_rate_idr <= params.maxPriceIdr!);
  }

  // If date filters provided, exclude villas with conflicting bookings
  if (params.checkIn && params.checkOut) {
    const villaIds = villas.map((v) => v.id);
    if (villaIds.length > 0) {
      const { data: conflicts } = await supabase
        .from("bookings")
        .select("villa_id")
        .in("villa_id", villaIds)
        .in("status", ["confirmed", "active"])
        .lt("check_in", params.checkOut)
        .gt("check_out", params.checkIn);

      if (conflicts && conflicts.length > 0) {
        const conflictingIds = new Set(
          conflicts.map((c: { villa_id: string }) => c.villa_id)
        );
        villas = villas.filter((v) => !conflictingIds.has(v.id));
      }
    }
  }

  return villas;
}

export async function getVillaById(
  villaId: string
): Promise<Villa & { photos: VillaPhoto[] }> {
  const supabase = await createClient();

  const { data: villa, error } = await supabase
    .from("villas")
    .select("*")
    .eq("id", villaId)
    .single<Villa>();

  if (error || !villa) throw new Error("Villa not found.");

  const { data: photos } = await supabase
    .from("villa_photos")
    .select("*")
    .eq("villa_id", villaId)
    .order("sort_order", { ascending: true })
    .returns<VillaPhoto[]>();

  return { ...villa, photos: photos ?? [] };
}

export async function checkAvailability(
  villaId: string,
  checkIn: string,
  checkOut: string
): Promise<{
  available: boolean;
  conflicts: { source: string; start: string; end: string }[];
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_villa_availability", {
    villa_uuid: villaId,
    desired_check_in: checkIn,
    desired_check_out: checkOut,
  });

  if (error) throw new Error(`Availability check failed: ${error.message}`);

  const conflicts = ((data ?? []) as { conflict_source: string; conflict_start: string; conflict_end: string }[]).map(
    (row) => ({
      source: row.conflict_source,
      start: row.conflict_start,
      end: row.conflict_end,
    })
  );

  return { available: conflicts.length === 0, conflicts };
}

export async function createVilla(data: VillaInsert): Promise<Villa> {
  const supabase = await createClient();

  if (data.bump_notice_hours !== undefined && data.bump_notice_hours < 18) {
    throw new Error("bump_notice_hours must be at least 18.");
  }

  const { data: villa, error } = await supabase
    .from("villas")
    .insert(data)
    .select()
    .single<Villa>();

  if (error) throw new Error(`Failed to create villa: ${error.message}`);
  return villa;
}

export async function updateVilla(
  villaId: string,
  data: VillaUpdate
): Promise<Villa> {
  const supabase = await createClient();

  if (data.bump_notice_hours !== undefined && data.bump_notice_hours < 18) {
    throw new Error("bump_notice_hours must be at least 18.");
  }

  const { data: villa, error } = await supabase
    .from("villas")
    .update(data)
    .eq("id", villaId)
    .select()
    .single<Villa>();

  if (error) throw new Error(`Failed to update villa: ${error.message}`);
  return villa;
}

export async function getVillasByOwner(ownerId: string): Promise<Villa[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("villas")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .returns<Villa[]>();

  if (error) throw new Error(`Failed to fetch owner villas: ${error.message}`);
  return data ?? [];
}
