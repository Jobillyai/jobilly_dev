import { cache } from "react";
import { createClient } from "@/server/db/supabase-server";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  memberId?: string | null;
  role?: string | null;
};

/**
 * Reads the current user from the Supabase JWT stored in HTTP-only cookies.
 * Cached per request so layouts, shell, and pages share one auth round-trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
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
    .select("role, member_id")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email,
    name,
    avatarUrl,
    memberId: profile?.member_id ?? null,
    role: profile?.role ?? null,
  };
});
