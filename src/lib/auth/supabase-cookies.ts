import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("auth-token");
}

/**
 * Supabase defaults to long-lived auth cookies. Strip Max-Age/Expires so the
 * session ends when the browser is fully closed.
 */
export function asBrowserSessionCookieOptions(
  name: string,
  options: CookieOptions = {},
): CookieOptions {
  if (!isSupabaseAuthCookie(name)) {
    return options;
  }

  const sessionOptions: CookieOptions = {
    path: options.path ?? "/",
    sameSite: options.sameSite ?? "lax",
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? process.env.NODE_ENV === "production",
  };

  if (options.domain) {
    sessionOptions.domain = options.domain;
  }

  return sessionOptions;
}

export function applySessionCookiesToSet(
  cookiesToSet: CookieToSet[],
  setter: (name: string, value: string, options: CookieOptions) => void,
): void {
  cookiesToSet.forEach(({ name, value, options }) =>
    setter(name, value, asBrowserSessionCookieOptions(name, options)),
  );
}
