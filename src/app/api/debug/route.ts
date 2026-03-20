import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const supabaseCookies = allCookies.filter(
    (c) => c.name.startsWith("sb-") || c.name.includes("supabase")
  );

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    totalCookies: allCookies.length,
    supabaseCookieNames: supabaseCookies.map((c) => c.name),
    supabaseCookieCount: supabaseCookies.length,
    user: user ? { id: user.id, email: user.email } : null,
    authError: error?.message ?? null,
  });
}
