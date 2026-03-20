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

    const { error } = await supabase
      .from("owner_profiles")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ removed: true });
  } catch (err) {
    console.error("Remove owner error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
