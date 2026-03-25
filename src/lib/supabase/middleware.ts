import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth
  const publicPaths = ["/", "/login", "/signup", "/renter", "/owner", "/auth/callback", "/auth/redirect", "/browse"];
  const publicPrefixes = ["/villa/"];
  const isPublicPath =
    publicPaths.some((path) => request.nextUrl.pathname === path) ||
    publicPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  // Public API routes (webhooks, cron, browsing, iCal, setup, debug)
  const publicApiPrefixes = ["/api/webhooks/", "/api/cron/", "/api/villas/viewport", "/api/villas/search", "/api/ical/", "/api/setup", "/api/seed/", "/api/debug", "/api/messages", "/api/conversations"];
  const isPublicApi = publicApiPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  // If a Bearer token is present, let the route handler verify it (mobile app auth)
  const hasBearerToken = request.headers.get("authorization")?.startsWith("Bearer ");

  if (!user && !isPublicPath && !isPublicApi && !hasBearerToken) {
    // API routes get 401 JSON; pages get redirected to login
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
