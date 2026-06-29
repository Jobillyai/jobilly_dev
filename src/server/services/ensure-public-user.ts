import type { User } from "@supabase/supabase-js";
import {
  combineFirstLastName,
  getNameFromMetadata,
} from "@/lib/format-person-name";
import {
  getAuthUserDisplayName,
  getAuthUserFirstLastName,
} from "@/lib/auth/user-display-name";
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

  const { firstName, lastName, fullName } = getNameFromMetadata(user.user_metadata);
  const resolvedFirst = firstName || getAuthUserFirstLastName(user).firstName;
  const resolvedLast = lastName || getAuthUserFirstLastName(user).lastName;
  const name =
    fullName ||
    getAuthUserDisplayName(user) ||
    combineFirstLastName(resolvedFirst, resolvedLast) ||
    null;

  const { error } = await admin.from("users").insert({
    id: user.id,
    email: user.email ?? "",
    name,
    first_name: resolvedFirst || null,
    last_name: resolvedLast || null,
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
