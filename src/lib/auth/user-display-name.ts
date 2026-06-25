import type { User } from "@supabase/supabase-js";

export function getAuthUserDisplayName(user: User): string | null {
  const metadata = user.user_metadata;

  if (typeof metadata?.name === "string" && metadata.name.trim()) {
    return metadata.name.trim();
  }

  if (typeof metadata?.full_name === "string" && metadata.full_name.trim()) {
    return metadata.full_name.trim();
  }

  return null;
}
