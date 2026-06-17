import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/server/db/supabase-server";

/**
 * Supabase emails a link to `${NEXT_PUBLIC_APP_URL}/auth/callback?code=...`
 * after signup. This exchanges that one-time code for a real session
 * (sets the auth cookies) and then sends the user on to the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
