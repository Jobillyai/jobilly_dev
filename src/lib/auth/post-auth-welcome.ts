import { formatDisplayName } from "@/lib/format-display-name";

/** Cookie set on successful login / OAuth so portal layouts can show a one-shot welcome splash. */
export const POST_AUTH_WELCOME_COOKIE = "jb_welcome";

export function getPostAuthWelcomeCookieOptions() {
  return {
    path: "/",
    maxAge: 120,
    sameSite: "lax" as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };
}

/** First name for “Hello {Name}”; falls back to email local-part. */
export function postAuthWelcomeDisplayName(
  name: string | undefined,
  email: string,
): string {
  if (name?.trim()) {
    const formatted = formatDisplayName(name);
    return formatted.split(/\s+/)[0] ?? formatted;
  }
  const local = email.split("@")[0]?.trim();
  return local ? formatDisplayName(local.replace(/[._-]+/g, " ")) : "there";
}
