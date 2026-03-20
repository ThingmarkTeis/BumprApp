import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// TEMPORARY setup route — delete after initial setup
export async function GET() {
  const supabase = createAdminClient();

  const results: string[] = [];

  // 1. Make admin@bumpr.rent an admin (should already be, but ensure)
  const { data: adminUser } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("email", "admin@bumpr.rent")
    .single<{ id: string; is_admin: boolean }>();

  if (adminUser) {
    if (!adminUser.is_admin) {
      await supabase.from("profiles").update({ is_admin: true }).eq("id", adminUser.id);
      results.push(`Made admin@bumpr.rent an admin`);
    } else {
      results.push(`admin@bumpr.rent is already admin`);
    }
  } else {
    results.push("admin@bumpr.rent not found");
  }

  // 2. Create owner_profiles record for owner@bumpr.rent
  const { data: ownerUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "owner@bumpr.rent")
    .single<{ id: string }>();

  if (ownerUser) {
    const { data: existing } = await supabase
      .from("owner_profiles")
      .select("id")
      .eq("id", ownerUser.id)
      .single();

    if (existing) {
      results.push(`owner@bumpr.rent already has owner_profiles`);
    } else {
      const { error } = await supabase.from("owner_profiles").insert({
        id: ownerUser.id,
      });
      if (error) {
        results.push(`Failed: ${error.message}`);
      } else {
        results.push(`Created owner_profiles for owner@bumpr.rent (${ownerUser.id})`);
      }
    }
  } else {
    results.push("owner@bumpr.rent not found");
  }

  // 3. Confirm renter@bumpr.rent is just a renter (no owner_profiles, not admin)
  const { data: renterUser } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("email", "renter@bumpr.rent")
    .single<{ id: string; is_admin: boolean }>();

  if (renterUser) {
    results.push(`renter@bumpr.rent exists, is_admin=${renterUser.is_admin}`);
  } else {
    results.push("renter@bumpr.rent not found");
  }

  return NextResponse.json({ results });
}
