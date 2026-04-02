import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveVillaSchema } from "@/lib/validations/saved-villas";
import type { SavedVillasResponse, SavedVillaItem } from "@/types/saved-villas";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET /api/saved-villas — List all saved villas for the authenticated user
export async function GET(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch saved villa records
    const { data: savedRecords, error } = await admin
      .from("saved_villas")
      .select("id, villa_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!savedRecords || savedRecords.length === 0) {
      return NextResponse.json({ villas: [], total: 0 } satisfies SavedVillasResponse);
    }

    // Fetch villa details
    const villaIds = savedRecords.map((r) => r.villa_id);

    const { data: villas } = await admin
      .from("villas")
      .select("id, title, area, standby_rate_idr, bedrooms, max_guests, location, status")
      .in("id", villaIds);

    const villaMap = new Map(
      (villas ?? []).map((v) => [v.id, v])
    );

    // Fetch photos for all villas
    const { data: allPhotos } = await admin
      .from("villa_photos")
      .select("villa_id, url, caption")
      .in("villa_id", villaIds)
      .order("sort_order", { ascending: true });

    const photoMap = new Map<string, { url: string; alt: string }[]>();
    for (const p of allPhotos ?? []) {
      const existing = photoMap.get(p.villa_id) ?? [];
      existing.push({ url: p.url, alt: p.caption ?? "" });
      photoMap.set(p.villa_id, existing);
    }

    // Check availability: find villas with active bookings today
    const today = new Date().toISOString().split("T")[0];
    const { data: activeBookings } = await admin
      .from("bookings")
      .select("villa_id")
      .in("villa_id", villaIds)
      .in("status", ["confirmed", "active"])
      .lte("check_in", today)
      .gte("check_out", today);

    const unavailableVillaIds = new Set(
      (activeBookings ?? []).map((b: { villa_id: string }) => b.villa_id)
    );

    // Build response
    const items: SavedVillaItem[] = [];
    for (const record of savedRecords) {
      const villa = villaMap.get(record.villa_id);
      if (!villa) continue;

      // Parse location
      let lat: number | null = null;
      let lng: number | null = null;
      if (typeof villa.location === "string" && (villa.location as string).length >= 42) {
        try {
          const buf = Buffer.from(villa.location as string, "hex");
          const le = buf[0] === 1;
          const readDouble = le
            ? (offset: number) => buf.readDoubleLE(offset)
            : (offset: number) => buf.readDoubleBE(offset);
          lng = readDouble(9);
          lat = readDouble(17);
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            lat = null;
            lng = null;
          }
        } catch {
          // Skip unparseable
        }
      }

      items.push({
        id: record.id,
        villa_id: record.villa_id,
        villa: {
          id: villa.id,
          title: villa.title,
          slug: slugify(villa.title),
          standby_rate: villa.standby_rate_idr,
          bedrooms: villa.bedrooms,
          max_guests: villa.max_guests,
          location: { lat, lng, area: villa.area },
          images: photoMap.get(villa.id) ?? [],
          rating: null,
          review_count: 0,
          is_available: !unavailableVillaIds.has(villa.id),
        },
        saved_at: record.created_at,
      });
    }

    const response: SavedVillasResponse = {
      villas: items,
      total: items.length,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("List saved villas error:", err);
    return NextResponse.json(
      { error: "Failed to fetch saved villas." },
      { status: 500 }
    );
  }
}

// POST /api/saved-villas — Save a villa
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = saveVillaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { villa_id } = parsed.data;
    const admin = createAdminClient();

    // Validate villa exists and is active
    const { data: villa } = await admin
      .from("villas")
      .select("id, status")
      .eq("id", villa_id)
      .single();

    if (!villa || villa.status !== "active") {
      return NextResponse.json(
        { error: "Villa not found or not active." },
        { status: 404 }
      );
    }

    // Upsert — idempotent save (ignore conflict on unique constraint)
    const { error } = await admin
      .from("saved_villas")
      .upsert(
        { user_id: user.id, villa_id },
        { onConflict: "user_id,villa_id" }
      );

    if (error) throw error;

    return NextResponse.json({ saved: true, villa_id });
  } catch (err) {
    console.error("Save villa error:", err);
    return NextResponse.json(
      { error: "Failed to save villa." },
      { status: 500 }
    );
  }
}
