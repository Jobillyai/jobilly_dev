import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOriginFromRequest } from "@/lib/auth/app-origin";
import { applySessionCookiesToSet } from "@/lib/auth/supabase-cookies";

/**
 * Starts Google OAuth from a route handler so the PKCE verifier cookie is set
 * on the redirect response — more reliable than a server action in production.
 */
export async function GET(request: NextRequest) {
  const origin = getOriginFromRequest(request);
  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookieResponse = NextResponse.next({ request });
          applySessionCookiesToSet(cookiesToSet, (name, value, options) =>
            cookieResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    console.error("Google OAuth start error:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }

  const redirectResponse = NextResponse.redirect(data.url);
  cookieResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
