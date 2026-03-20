import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { full_name, email, phone, bank_name, bank_account_number, bank_account_holder } = body;

    if (!full_name || !email) {
      return NextResponse.json(
        { error: "full_name and email are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (authError) throw authError;
    const userId = authData.user.id;

    // The profile is auto-created by the DB trigger, but update it with phone
    if (phone) {
      await supabase.from("profiles").update({ phone }).eq("id", userId);
    }

    // Create owner_profiles record
    await supabase.from("owner_profiles").insert({
      id: userId,
      bank_name: bank_name ?? null,
      bank_account_number: bank_account_number ?? null,
      bank_account_holder: bank_account_holder ?? null,
    });

    return NextResponse.json({ id: userId }, { status: 201 });
  } catch (err) {
    console.error("Create owner error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
