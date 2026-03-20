import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const admin = createAdminClient();

  // Check admin
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single<{ is_admin: boolean }>();

  if (profile?.is_admin) {
    return NextResponse.redirect(`${origin}/admin`);
  }

  // Check owner
  const { data: ownerProfile } = await admin
    .from("owner_profiles")
    .select("id")
    .eq("id", user.id)
    .single<{ id: string }>();

  if (ownerProfile) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/browse`);
}
