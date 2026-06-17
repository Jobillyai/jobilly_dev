import { createClient } from "@/server/db/supabase-server";
import type { SessionUser } from "@/lib/auth/session";

export type UserProfile = SessionUser & {
  education: string;
  careerGoals: string;
  linkedinUrl: string;
};

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user?.email) {
    return null;
  }

  const userId = authData.user.id;

  const { data: dbUser } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", userId)
    .single();

  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("education, career_goals, linkedin_url")
    .eq("user_id", userId)
    .maybeSingle();

  const name =
    dbUser?.name ??
    (typeof authData.user.user_metadata?.name === "string"
      ? authData.user.user_metadata.name
      : undefined);

  const avatarUrl =
    typeof authData.user.user_metadata?.avatar_url === "string"
      ? authData.user.user_metadata.avatar_url
      : undefined;

  return {
    id: userId,
    email: dbUser?.email ?? authData.user.email,
    name,
    avatarUrl,
    education: candidateProfile?.education ?? "",
    careerGoals: candidateProfile?.career_goals ?? "",
    linkedinUrl: candidateProfile?.linkedin_url ?? "",
  };
}
