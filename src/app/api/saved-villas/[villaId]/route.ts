import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE /api/saved-villas/[villaId] — Unsave a villa
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ villaId: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { villaId } = await params;
    const admin = createAdminClient();

    // Delete the saved record — idempotent (no error if not found)
    await admin
      .from("saved_villas")
      .delete()
      .eq("user_id", user.id)
      .eq("villa_id", villaId);

    return NextResponse.json({ saved: false, villa_id: villaId });
  } catch (err) {
    console.error("Unsave villa error:", err);
    return NextResponse.json(
      { error: "Failed to unsave villa." },
      { status: 500 }
    );
  }
}

// GET /api/saved-villas/[villaId] — Check if a villa is saved
export async function GET(
  request: Request,
  { params }: { params: Promise<{ villaId: string }> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { villaId } = await params;
    const admin = createAdminClient();

    const { data } = await admin
      .from("saved_villas")
      .select("id")
      .eq("user_id", user.id)
      .eq("villa_id", villaId)
      .maybeSingle();

    return NextResponse.json({ saved: !!data });
  } catch (err) {
    console.error("Check saved status error:", err);
    return NextResponse.json(
      { error: "Failed to check saved status." },
      { status: 500 }
    );
  }
}
