import { createClient } from "@/server/db/supabase-server";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  memberId?: string | null;
};

/**
 * Reads the current user from the Supabase JWT stored in HTTP-only cookies.
 * Middleware refreshes the token on each request so SSR always sees a valid session.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user?.email) {
    return null;
  }

  const name =
    typeof data.user.user_metadata?.name === "string"
      ? data.user.user_metadata.name
      : undefined;

  const avatarUrl =
    typeof data.user.user_metadata?.avatar_url === "string"
      ? data.user.user_metadata.avatar_url
      : undefined;

  const { data: profile } = await supabase
    .from("users")
    .select("member_id")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email,
    name,
    avatarUrl,
    memberId: profile?.member_id ?? null,
  };
}
