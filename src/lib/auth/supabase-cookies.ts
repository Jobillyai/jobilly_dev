import type { CookieOptions } from "@supabase/ssr";
import { serialize } from "cookie";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

/** Marks an active browser tab session (cleared when the browser fully closes). */
export const TAB_SESSION_COOKIE_NAME = "jb-tab-session";

export function isSupabaseAuthCookie(name: string): boolean {
  return (
    name.startsWith("sb-") &&
    (name.includes("auth-token") || name.includes("code-verifier"))
  );
}

function sessionOnlyCookieOptions(
  options: CookieOptions = {},
  defaults: { httpOnly: boolean },
): CookieOptions {
  const sessionOptions: CookieOptions = {
    path: options.path ?? "/",
    sameSite: options.sameSite ?? "lax",
    httpOnly: options.httpOnly ?? defaults.httpOnly,
    secure: options.secure ?? process.env.NODE_ENV === "production",
  };

  if (options.domain) {
    sessionOptions.domain = options.domain;
  }

  return sessionOptions;
}

export function getTabSessionCookieOptions(): CookieOptions {
  return sessionOnlyCookieOptions({}, { httpOnly: false });
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

  return sessionOnlyCookieOptions(options, { httpOnly: true });
}

export function applySessionCookiesToSet(
  cookiesToSet: CookieToSet[],
  setter: (name: string, value: string, options: CookieOptions) => void,
): void {
  cookiesToSet.forEach(({ name, value, options }) =>
    setter(name, value, asBrowserSessionCookieOptions(name, options)),
  );
}

export function readDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === "undefined") {
    return [];
  }

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator === -1) {
        return { name: part, value: "" };
      }

      return {
        name: part.slice(0, separator),
        value: part.slice(separator + 1),
      };
    });
}

export function writeDocumentCookie(
  name: string,
  value: string,
  options: CookieOptions,
): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = serialize(name, value, options);
}

export function applySessionCookiesToDocument(
  cookiesToSet: CookieToSet[],
): void {
  applySessionCookiesToSet(cookiesToSet, writeDocumentCookie);
}

export function hasDocumentCookie(name: string): boolean {
  return readDocumentCookies().some((cookie) => cookie.name === name);
}

export function hasSupabaseAuthDocumentCookie(): boolean {
  return readDocumentCookies().some((cookie) => isSupabaseAuthCookie(cookie.name));
}

export function clearBrowserTabSession(): void {
  writeDocumentCookie(TAB_SESSION_COOKIE_NAME, "", {
    ...getTabSessionCookieOptions(),
    maxAge: 0,
  });
}

export function attachTabSessionCookie(
  response: { cookies: { set: (name: string, value: string, options?: CookieOptions) => void; delete: (name: string) => void } },
  isLoggedIn: boolean,
): void {
  if (isLoggedIn) {
    response.cookies.set(TAB_SESSION_COOKIE_NAME, "1", getTabSessionCookieOptions());
    return;
  }

  response.cookies.delete(TAB_SESSION_COOKIE_NAME);
}
