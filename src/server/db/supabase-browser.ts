import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/server/db/database.types";
import {
  applySessionCookiesToDocument,
  readDocumentCookies,
} from "@/lib/auth/supabase-cookies";

/**
 * Browser-side Supabase client. Uses the anon key — all access is governed
 * by Row-Level Security policies, never by this client's privileges.
 *
 * Auth cookies are session-only (no Max-Age) so closing the browser ends login.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return readDocumentCookies();
        },
        setAll(cookiesToSet) {
          applySessionCookiesToDocument(cookiesToSet);
        },
      },
    },
  );
}
