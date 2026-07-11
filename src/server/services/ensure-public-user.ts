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
import { registerNewCandidateSignup } from "@/server/services/register-new-candidate-signup";

function resolveUserNames(user: User) {
  const { firstName, lastName, fullName } = getNameFromMetadata(user.user_metadata);
  const resolvedFirst = firstName || getAuthUserFirstLastName(user).firstName;
  const resolvedLast = lastName || getAuthUserFirstLastName(user).lastName;
  const name =
    fullName ||
    getAuthUserDisplayName(user) ||
    combineFirstLastName(resolvedFirst, resolvedLast) ||
    null;

  return { resolvedFirst, resolvedLast, name };
}

export async function ensurePublicUserRecord(
  user: User,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { resolvedFirst, resolvedLast, name } = resolveUserNames(user);

  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("users").insert({
      id: user.id,
      email: user.email ?? "",
      name,
      first_name: resolvedFirst || null,
      last_name: resolvedLast || null,
      role: "free_candidate",
    });

    if (error && error.code !== "23505") {
      return { error: error.message };
    }
  }

  await registerNewCandidateSignup({
    userId: user.id,
    email: user.email ?? "",
    firstName: resolvedFirst,
    lastName: resolvedLast,
  });

  return {};
}
