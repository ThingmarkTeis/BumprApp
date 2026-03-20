import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];

export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Validate bump_notice_hours
    if (body.bump_notice_hours !== undefined && body.bump_notice_hours < 18) {
      return NextResponse.json(
        { error: "bump_notice_hours must be at least 18." },
        { status: 400 }
      );
    }

    const { data: villa, error } = await supabase
      .from("villas")
      .insert({
        owner_id: body.owner_id,
        title: body.title,
        description: body.description ?? null,
        area: body.area,
        address: body.address ?? null,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms ?? null,
        max_guests: body.max_guests,
        standby_rate_idr: body.standby_rate_idr,
        bump_notice_hours: body.bump_notice_hours ?? 18,
        check_in_by: body.check_in_by ?? null,
        earliest_check_in: body.earliest_check_in ?? null,
        amenities: body.amenities ?? [],
        status: body.status ?? "draft",
        ical_url: body.ical_url ?? null,
        location: body.lng && body.lat
          ? `SRID=4326;POINT(${body.lng} ${body.lat})`
          : null,
      })
      .select()
      .single<Villa>();

    if (error) throw error;

    return NextResponse.json(villa, { status: 201 });
  } catch (err) {
    console.error("Create villa error:", err);
    return NextResponse.json(
      { error: "Failed to create villa." },
      { status: 500 }
    );
  }
}
