import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    await supabase
      .from("bumps")
      .update({
        status: "admin_review",
        admin_notes: body.notes ?? "Flagged by admin",
      })
      .eq("id", id);

    return NextResponse.json({ flagged: true });
  } catch (err) {
    console.error("Flag bump error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
