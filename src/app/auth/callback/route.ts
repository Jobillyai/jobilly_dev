import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookiesToSet } from "@/lib/auth/supabase-cookies";
import { isAdminRole } from "@/lib/auth/roles";
import { sanitizeInternalRedirectPath } from "@/lib/auth/safe-redirect";
import { ensurePublicUserRecord } from "@/server/services/ensure-public-user";

const RESET_FLOW_COOKIE = "jb_reset_flow";

async function resolvePostAuthRedirect(
  supabase: ReturnType<typeof createServerClient>,
  fallback: string,
  options?: { preserveFallbackForAdmin?: boolean },
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fallback;
  }

  await ensurePublicUserRecord(user);

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (isAdminRole(profile?.role) && !options?.preserveFallbackForAdmin) {
    return "/admin";
  }

  return fallback;
}

function redirectWithSessionCookies(
  origin: string,
  path: string,
  cookiesToSet: { name: string; value: string; options: CookieOptions }[],
) {
  const response = NextResponse.redirect(`${origin}${path}`);
  applySessionCookiesToSet(cookiesToSet, (name, value, options) =>
    response.cookies.set(name, value, options),
  );
  response.cookies.delete(RESET_FLOW_COOKIE);
  return response;
}

/**
 * Supabase emails a link to `${APP_URL}/auth/callback?code=...` (or
 * `?token_hash=...&type=signup`) after signup, password recovery, or OAuth.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const isPasswordReset =
    request.cookies.get(RESET_FLOW_COOKIE)?.value === "1" ||
    type === "recovery";
  const defaultFallback = isPasswordReset ? "/reset-password" : "/dashboard";
  const requestedNext = searchParams.get("next") ?? defaultFallback;

  const next = sanitizeInternalRedirectPath(requestedNext, defaultFallback);

  let sessionCookies: { name: string; value: string; options: CookieOptions }[] =
    [];

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
          sessionCookies = cookiesToSet;
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = await resolvePostAuthRedirect(supabase, next, {
        preserveFallbackForAdmin: isPasswordReset,
      });
      return redirectWithSessionCookies(origin, destination, sessionCookies);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      const destination = await resolvePostAuthRedirect(supabase, next, {
        preserveFallbackForAdmin: isPasswordReset,
      });
      return redirectWithSessionCookies(origin, destination, sessionCookies);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
