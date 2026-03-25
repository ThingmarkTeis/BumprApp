import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingInfo } from "@/types/booking";

// GET /api/villas/[id]/booking-info — Fetch booking prerequisites
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: villa, error } = await supabase
      .from("villas")
      .select("id, title, standby_rate_idr, earliest_check_in, check_in_by, max_guests, owner_id, description")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (error || !villa) {
      return NextResponse.json({ error: "Villa not found or not active." }, { status: 404 });
    }

    // Get owner display name
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", villa.owner_id)
      .single<{ id: string; full_name: string }>();

    // Get villa images
    const { data: photos } = await supabase
      .from("villa_photos")
      .select("url, caption")
      .eq("villa_id", id)
      .order("sort_order", { ascending: true });

    // Read new columns via raw select (they may not be in TS types yet)
    const { data: villaExtra } = await supabase
      .from("villas")
      .select("check_out_time, house_rules")
      .eq("id", id)
      .single();

    const response: BookingInfo = {
      villa_id: villa.id,
      villa_title: villa.title,
      standby_rate: villa.standby_rate_idr,
      earliest_check_in_time: villa.earliest_check_in ?? "14:00",
      check_out_time: (villaExtra as Record<string, unknown>)?.check_out_time as string ?? "11:00",
      max_guests: villa.max_guests,
      house_rules: (villaExtra as Record<string, unknown>)?.house_rules as string ?? null,
      owner: {
        id: villa.owner_id,
        display_name: ownerProfile?.full_name ?? "Villa Owner",
      },
      images: (photos ?? []).map((p: { url: string; caption: string | null }) => ({
        url: p.url,
        alt: p.caption ?? villa.title,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Get booking info error:", err);
    return NextResponse.json({ error: "Failed to fetch booking info." }, { status: 500 });
  }
}
