import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type Villa = Database["public"]["Tables"]["villas"]["Row"];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    if (body.bump_notice_hours !== undefined && body.bump_notice_hours < 18) {
      return NextResponse.json(
        { error: "bump_notice_hours must be at least 18." },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    const fields = [
      "title", "description", "area", "address", "bedrooms", "bathrooms",
      "max_guests", "standby_rate_idr", "bump_notice_hours", "check_in_by",
      "earliest_check_in", "amenities", "status", "ical_url", "owner_id",
    ];

    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    if (body.lng !== undefined && body.lat !== undefined) {
      updates.location = `SRID=4326;POINT(${body.lng} ${body.lat})`;
    }

    const { data: villa, error } = await supabase
      .from("villas")
      .update(updates)
      .eq("id", id)
      .select()
      .single<Villa>();

    if (error) throw error;

    return NextResponse.json(villa);
  } catch (err) {
    console.error("Update villa error:", err);
    return NextResponse.json(
      { error: "Failed to update villa." },
      { status: 500 }
    );
  }
}
