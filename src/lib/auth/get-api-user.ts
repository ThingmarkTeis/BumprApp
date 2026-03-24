import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

/**
 * Get the authenticated user from either cookies (web) or Bearer token (mobile).
 * Use this in API routes that need to support both auth methods.
 */
export async function getApiUser(request: Request): Promise<User | null> {
  // Try cookie-based auth first (web app)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // Fall back to Bearer token (mobile app)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const admin = createAdminClient();
  const { data: { user: tokenUser } } = await admin.auth.getUser(token);
  return tokenUser;
}
