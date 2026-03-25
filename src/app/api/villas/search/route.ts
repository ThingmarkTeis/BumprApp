import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchParamsSchema } from "@/lib/validations/search";
import type {
  SearchResponse,
  SearchErrorResponse,
  VillaSearchResult,
} from "@/types/search";

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter — 60 requests/minute per IP
// ---------------------------------------------------------------------------
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up stale entries to prevent memory growth
let lastCleanup = Date.now();
function cleanupRateLimit() {
  const now = Date.now();
  if (now - lastCleanup < RATE_WINDOW_MS) return;
  lastCleanup = now;
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

function checkRateLimit(ip: string): boolean {
  cleanupRateLimit();
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// ---------------------------------------------------------------------------
// GET /api/villas/search
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    // Rate-limit check
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." } satisfies SearchErrorResponse,
        { status: 429 }
      );
    }

    // Parse query params from URL
    const { searchParams } = new URL(request.url);
    const raw: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });

    // Validate with Zod
    const parsed = searchParamsSchema.safeParse(raw);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!details[key]) details[key] = [];
        details[key].push(issue.message);
      }
      return NextResponse.json(
        { error: "Invalid search parameters.", details } satisfies SearchErrorResponse,
        { status: 400 }
      );
    }

    const params = parsed.data;

    // Parse bounds string into components
    let boundsSw: { lat: number; lng: number } | null = null;
    let boundsNe: { lat: number; lng: number } | null = null;
    if (params.bounds) {
      const [swLat, swLng, neLat, neLng] = params.bounds.split(",").map(Number);
      boundsSw = { lat: swLat, lng: swLng };
      boundsNe = { lat: neLat, lng: neLng };
    }

    // Parse amenities string into array
    const amenities =
      params.amenities
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || null;

    // Determine sort — default to "distance" when lat/lng provided, otherwise null (newest)
    const sort = params.sort ?? (params.lat != null ? "distance" : null);

    // Call the Postgres search function
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("search_villas", {
      search_lat: params.lat ?? null,
      search_lng: params.lng ?? null,
      search_radius_km: params.radius ?? 15,
      bounds_sw_lat: boundsSw?.lat ?? null,
      bounds_sw_lng: boundsSw?.lng ?? null,
      bounds_ne_lat: boundsNe?.lat ?? null,
      bounds_ne_lng: boundsNe?.lng ?? null,
      filter_check_in: params.check_in ?? null,
      filter_check_out: params.check_out ?? null,
      filter_min_price: params.min_price ?? null,
      filter_max_price: params.max_price ?? null,
      filter_bedrooms: params.bedrooms ?? null,
      filter_guests: params.guests ?? null,
      filter_amenities: amenities,
      sort_by: sort,
      page_number: params.page,
      page_limit: params.limit,
    });

    if (error) {
      console.error("search_villas RPC error:", error);
      return NextResponse.json(
        { error: "Search failed." } satisfies SearchErrorResponse,
        { status: 500 }
      );
    }

    // Shape response
    const rows = (data ?? []) as Array<{
      villa_id: string;
      villa_title: string;
      villa_area: string;
      standby_rate: number;
      villa_bedrooms: number;
      villa_bathrooms: number;
      villa_max_guests: number;
      lat: number;
      lng: number;
      villa_amenities: string[];
      villa_owner_id: string;
      owner_name: string;
      owner_verified: boolean;
      images: { url: string; alt: string }[];
      distance_meters: number | null;
      total_count: number;
    }>;

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

    const villas: VillaSearchResult[] = rows.map((row) => ({
      id: row.villa_id,
      title: row.villa_title,
      slug: slugify(row.villa_title),
      standby_rate: row.standby_rate,
      currency: "IDR" as const,
      bedrooms: row.villa_bedrooms,
      bathrooms: row.villa_bathrooms,
      max_guests: row.villa_max_guests,
      location: {
        lat: row.lat,
        lng: row.lng,
        area: row.villa_area,
      },
      images: row.images ?? [],
      amenities: Array.isArray(row.villa_amenities) ? row.villa_amenities : [],
      rating: null, // Reviews system is out of v1 scope
      review_count: 0,
      is_available: true, // Unavailable villas are already filtered out
      distance_km:
        row.distance_meters != null
          ? Math.round((row.distance_meters / 1000) * 100) / 100
          : null,
      owner: {
        id: row.villa_owner_id,
        display_name: row.owner_name,
        is_verified: row.owner_verified,
      },
    }));

    const response: SearchResponse = {
      villas,
      total,
      page: params.page,
      limit: params.limit,
      has_more: params.page * params.limit < total,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Villa search error:", err);
    return NextResponse.json(
      { error: "Internal server error." } satisfies SearchErrorResponse,
      { status: 500 }
    );
  }
}
