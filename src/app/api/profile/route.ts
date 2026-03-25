import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth/get-api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateProfileSchema, deleteAccountSchema } from "@/lib/validations/profile";
import type { ProfileResponse, NotificationPreferences } from "@/types/profile";

function toProfileResponse(
  profile: { id: string; email: string; full_name: string; phone: string | null; avatar_url: string | null; language: string; preferred_currency: string; notification_preferences: Record<string, boolean>; created_at: string },
  hasOwnerRole: boolean
): ProfileResponse {
  return {
    id: profile.id,
    email: profile.email,
    display_name: profile.full_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    language: profile.language ?? "en",
    preferred_currency: profile.preferred_currency,
    notification_preferences: {
      email: profile.notification_preferences?.email ?? true,
      push: profile.notification_preferences?.push ?? true,
      whatsapp: profile.notification_preferences?.whatsapp ?? true,
    },
    has_owner_role: hasOwnerRole,
    created_at: profile.created_at,
  };
}

// GET /api/profile — Fetch current user profile
export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: ownerProfile } = await supabase
      .from("owner_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    return NextResponse.json(toProfileResponse(profile, !!ownerProfile));
  } catch (err) {
    console.error("Get profile error:", err);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

// PATCH /api/profile — Update profile
export async function PATCH(request: Request) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {};

    if (parsed.data.display_name !== undefined) updates.full_name = parsed.data.display_name;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.avatar_url !== undefined) updates.avatar_url = parsed.data.avatar_url;
    if (parsed.data.language !== undefined) updates.language = parsed.data.language;
    if (parsed.data.preferred_currency !== undefined) updates.preferred_currency = parsed.data.preferred_currency;
    if (parsed.data.notification_preferences !== undefined) updates.notification_preferences = parsed.data.notification_preferences;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    const { data: ownerProfile } = await supabase
      .from("owner_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    return NextResponse.json(toProfileResponse(profile, !!ownerProfile));
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

// DELETE /api/profile — Soft delete account
export async function DELETE(request: Request) {
  const user = await getApiUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Soft delete the profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString(), status: "deleted" })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // Cancel any active bookings
    const { error: bookingsError } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("renter_id", user.id)
      .in("status", ["requested", "approved", "confirmed", "active"]);

    if (bookingsError) {
      console.error("Failed to cancel bookings on account delete:", bookingsError);
    }

    // Sign the user out
    await supabase.auth.admin.signOut(user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
