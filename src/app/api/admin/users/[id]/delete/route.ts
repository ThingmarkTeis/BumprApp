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

    // Don't let admin delete themselves
    if (id === adminId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Delete owner_profiles first (FK constraint)
    await supabase.from("owner_profiles").delete().eq("id", id);

    // Delete the profile (cascades to bookings, notifications etc via FK)
    await supabase.from("profiles").delete().eq("id", id);

    // Delete the auth user
    await supabase.auth.admin.deleteUser(id);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
