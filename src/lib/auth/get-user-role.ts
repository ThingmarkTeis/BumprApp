import { createClient } from "@/lib/supabase/server";

export type UserRole = "renter" | "owner" | "admin";

export async function getUserRole(): Promise<{
  role: UserRole;
  userId: string;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check profile for admin status
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single<{ is_admin: boolean }>();

  if (profile?.is_admin) {
    return { role: "admin", userId: user.id };
  }

  // Check if owner_profiles record exists
  const { data: ownerProfile } = await supabase
    .from("owner_profiles")
    .select("id")
    .eq("id", user.id)
    .single<{ id: string }>();

  if (ownerProfile) {
    return { role: "owner", userId: user.id };
  }

  return { role: "renter", userId: user.id };
}

export function getRoleRedirect(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "owner":
      return "/dashboard";
    case "renter":
      return "/browse";
  }
}
