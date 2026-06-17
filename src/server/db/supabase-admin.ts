import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";

/**
 * Privileged Supabase client using the service-role key. BYPASSES Row-Level
 * Security entirely.
 *
 * Use ONLY for trusted server-only operations where RLS genuinely cannot
 * apply (e.g. background workers acting across tenants, scheduled jobs,
 * admin audit-log writes). Never import this into anything that runs in the
 * browser, and never use it as a shortcut to skip writing a proper RLS
 * policy — the `server-only` import will throw a build error if this file
 * is ever pulled into a client bundle.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
