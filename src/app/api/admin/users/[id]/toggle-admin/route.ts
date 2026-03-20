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

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", id)
      .single<{ is_admin: boolean }>();

    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await supabase
      .from("profiles")
      .update({ is_admin: !profile.is_admin })
      .eq("id", id);

    return NextResponse.json({ is_admin: !profile.is_admin });
  } catch (err) {
    console.error("Toggle admin error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
