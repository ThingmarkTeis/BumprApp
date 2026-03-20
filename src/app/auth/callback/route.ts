import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, getRoleRedirect } from "@/lib/auth/get-user-role";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Determine role and redirect accordingly
      const result = await getUserRole();
      if (result) {
        const redirectPath = getRoleRedirect(result.role);
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login`);
}
