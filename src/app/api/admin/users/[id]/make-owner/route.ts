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

    // Check owner_profiles doesn't already exist
    const { data: existing } = await supabase
      .from("owner_profiles")
      .select("id")
      .eq("id", id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Already an owner" }, { status: 400 });
    }

    const { error } = await supabase.from("owner_profiles").insert({ id });
    if (error) throw error;

    return NextResponse.json({ created: true });
  } catch (err) {
    console.error("Make owner error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
