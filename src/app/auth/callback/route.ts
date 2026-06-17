import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const RESET_FLOW_COOKIE = "jb_reset_flow";

/**
 * Supabase emails a link to `${APP_URL}/auth/callback?code=...` (or
 * `?token_hash=...&type=signup`) after signup or password recovery.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const isPasswordReset =
    request.cookies.get(RESET_FLOW_COOKIE)?.value === "1" ||
    type === "recovery";
  let next =
    searchParams.get("next") ??
    (isPasswordReset ? "/reset-password" : "/dashboard");

  if (!next.startsWith("/")) {
    next = isPasswordReset ? "/reset-password" : "/dashboard";
  }

  const successRedirect = `${origin}${next}`;
  let response = NextResponse.redirect(successRedirect);

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.redirect(successRedirect);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      response.cookies.delete(RESET_FLOW_COOKIE);
      return response;
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      response.cookies.delete(RESET_FLOW_COOKIE);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
