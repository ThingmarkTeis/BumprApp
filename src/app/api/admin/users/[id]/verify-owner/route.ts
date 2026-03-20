import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: owner } = await supabase
      .from("owner_profiles")
      .select("verified")
      .eq("id", id)
      .single<{ verified: boolean }>();

    if (!owner) return NextResponse.json({ error: "Not an owner" }, { status: 404 });

    await supabase
      .from("owner_profiles")
      .update({ verified: !owner.verified })
      .eq("id", id);

    return NextResponse.json({ verified: !owner.verified });
  } catch (err) {
    console.error("Verify owner error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
