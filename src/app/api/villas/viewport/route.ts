import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const area = searchParams.get("area");
  const minBedrooms = searchParams.get("minBedrooms");

  const supabase = createAdminClient();

  // Fetch all active villas (fallback: skip PostGIS if RPC doesn't exist)
  let villas: Villa[] = [];

  try {
    const west = parseFloat(searchParams.get("west") ?? "0");
    const south = parseFloat(searchParams.get("south") ?? "0");
    const east = parseFloat(searchParams.get("east") ?? "0");
    const north = parseFloat(searchParams.get("north") ?? "0");

    const { data, error } = await supabase.rpc("get_villas_in_viewport", {
      min_lng: west,
      min_lat: south,
      max_lng: east,
      max_lat: north,
    });

    if (!error && data) {
      villas = data as Villa[];
    } else {
      // Fallback: fetch all active villas without PostGIS filter
      const { data: allVillas } = await supabase
        .from("villas")
        .select("*")
        .eq("status", "active")
        .returns<Villa[]>();
      villas = allVillas ?? [];
    }
  } catch {
    // Fallback: fetch all active villas
    const { data: allVillas } = await supabase
      .from("villas")
      .select("*")
      .eq("status", "active")
      .returns<Villa[]>();
    villas = allVillas ?? [];
  }

  // Apply filters
  if (area && area !== "all") {
    villas = villas.filter((v) => v.area === area);
  }
  if (minBedrooms) {
    villas = villas.filter((v) => v.bedrooms >= parseInt(minBedrooms));
  }

  // Date filter: exclude villas with conflicting bookings
  if (checkIn && checkOut) {
    const villaIds = villas.map((v) => v.id);
    if (villaIds.length > 0) {
      const { data: conflicts } = await supabase
        .from("bookings")
        .select("villa_id")
        .in("villa_id", villaIds)
        .in("status", ["confirmed", "active"])
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);

      if (conflicts && conflicts.length > 0) {
        const conflictIds = new Set(
          conflicts.map((c: { villa_id: string }) => c.villa_id)
        );
        villas = villas.filter((v) => !conflictIds.has(v.id));
      }
    }
  }

  // Get hero photos
  const villaIds = villas.map((v) => v.id);
  let photoMap = new Map<string, string>();
  if (villaIds.length > 0) {
    const { data: photos } = await supabase
      .from("villa_photos")
      .select("villa_id, url")
      .in("villa_id", villaIds)
      .eq("sort_order", 0);

    photoMap = new Map(
      (photos ?? []).map((p: { villa_id: string; url: string }) => [p.villa_id, p.url])
    );
  }

  // Get lat/lng coordinates for each villa that has a location
  const coordMap = new Map<string, { lat: number; lng: number }>();
  if (villaIds.length > 0) {
    // Query ST_X and ST_Y to extract coordinates from geography
    const { data: coords } = await supabase
      .from("villas")
      .select("id, location")
      .in("id", villaIds)
      .not("location", "is", null);

    // Parse WKB hex to extract coordinates
    for (const row of coords ?? []) {
      const r = row as { id: string; location: string };
      if (typeof r.location === "string" && r.location.length >= 42) {
        try {
          // WKB format: byte_order(1) + type(4) + srid(4) + x(8) + y(8) = 25 bytes = 50 hex chars
          // With SRID: byte_order(1) + type(4) + srid(4) + x(8) + y(8)
          const buf = Buffer.from(r.location, "hex");
          // Check byte order: 01 = little endian
          const le = buf[0] === 1;
          const readDouble = le
            ? (offset: number) => buf.readDoubleLE(offset)
            : (offset: number) => buf.readDoubleBE(offset);
          // Skip: byte_order(1) + type(4) + srid(4) = 9 bytes
          const lng = readDouble(9);
          const lat = readDouble(17);
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            coordMap.set(r.id, { lat, lng });
          }
        } catch {
          // Skip unparseable locations
        }
      }
    }
  }

  const result = villas.map((v) => {
    const coord = coordMap.get(v.id);
    return {
      id: v.id,
      title: v.title,
      area: v.area,
      bedrooms: v.bedrooms,
      bathrooms: v.bathrooms,
      max_guests: v.max_guests,
      standby_rate_idr: v.standby_rate_idr,
      bump_notice_hours: v.bump_notice_hours,
      lat: coord?.lat ?? null,
      lng: coord?.lng ?? null,
      heroUrl: photoMap.get(v.id) ?? null,
    };
  });

  return NextResponse.json(result);
}
