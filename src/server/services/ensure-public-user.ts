import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/server/db/supabase-admin";

export async function ensurePublicUserRecord(
  user: User,
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return {};
  }

  const name =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;

  const { error } = await admin.from("users").insert({
    id: user.id,
    email: user.email ?? "",
    name,
    role: "free_candidate",
  });

  if (error) {
    if (error.code === "23505") {
      return {};
    }

    return { error: error.message };
  }

  return {};
}
