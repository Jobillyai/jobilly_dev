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

/**
 * The `on_auth_user_created` DB trigger inserts the public.users row as soon
 * as the auth account exists, so "row already present" does NOT mean the user
 * is old. Treat accounts created inside this window as fresh signups and let
 * welcome_email_sent_at dedupe repeat logins.
 */
const RECENT_SIGNUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function needsSignupRegistration(
  admin: ReturnType<typeof createAdminClient>,
  user: User,
  isNewUser: boolean,
): Promise<boolean> {
  if (isNewUser) {
    return true;
  }

  const createdAtMs = user.created_at ? new Date(user.created_at).getTime() : 0;
  if (!createdAtMs || Date.now() - createdAtMs > RECENT_SIGNUP_WINDOW_MS) {
    return false;
  }

  const { data: profile } = await admin
    .from("candidate_profiles")
    .select("welcome_email_sent_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return !profile?.welcome_email_sent_at;
}

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

  const isNewUser = !existing;

  if (isNewUser) {
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

  if (await needsSignupRegistration(admin, user, isNewUser)) {
    await registerNewCandidateSignup({
      userId: user.id,
      email: user.email ?? "",
      firstName: resolvedFirst,
      lastName: resolvedLast,
    });
  }

  return {};
}
