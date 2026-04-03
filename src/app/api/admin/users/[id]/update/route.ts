import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// PUT /api/admin/users/[id]/update — Admin edits a user's profile + owner profile
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    // Update profiles table
    const profileFields: Record<string, unknown> = {};
    if (body.full_name !== undefined) profileFields.full_name = body.full_name;
    if (body.email !== undefined) profileFields.email = body.email;
    if (body.phone !== undefined) profileFields.phone = body.phone;
    if (body.preferred_currency !== undefined) profileFields.preferred_currency = body.preferred_currency;
    if (body.language !== undefined) profileFields.language = body.language;

    if (Object.keys(profileFields).length > 0) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileFields)
        .eq("id", id);
      if (profileError) throw profileError;
    }

    // Update owner_profiles table (if owner fields provided)
    const ownerFields: Record<string, unknown> = {};
    if (body.business_name !== undefined) ownerFields.business_name = body.business_name;
    if (body.bank_name !== undefined) ownerFields.bank_name = body.bank_name;
    if (body.bank_account_number !== undefined) ownerFields.bank_account_number = body.bank_account_number;
    if (body.bank_account_holder !== undefined) ownerFields.bank_account_holder = body.bank_account_holder;
    if (body.id_type !== undefined) ownerFields.id_type = body.id_type;
    if (body.id_number !== undefined) ownerFields.id_number = body.id_number;

    if (Object.keys(ownerFields).length > 0) {
      const { error: ownerError } = await supabase
        .from("owner_profiles")
        .update(ownerFields)
        .eq("id", id);
      if (ownerError) throw ownerError;
    }

    return NextResponse.json({ updated: true });
  } catch (err) {
    console.error("Admin update user error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
