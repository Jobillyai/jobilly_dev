import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { applySessionCookiesToSet } from "@/lib/auth/supabase-cookies";
import type { Database } from "@/server/db/database.types";

/**
 * Server-side Supabase client for Server Components / Route Handlers / Server
 * Actions. Reads the session from cookies. Still anon-key + RLS — this is NOT
 * the privileged client. Use `createAdminClient` only for trusted server-only
 * operations that must bypass RLS (e.g. internal cron jobs).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            applySessionCookiesToSet(cookiesToSet, (name, value, options) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session instead. Safe to ignore.
          }
        },
      },
    },
  );
}
