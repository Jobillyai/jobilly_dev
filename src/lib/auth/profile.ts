import { createClient } from "@/server/db/supabase-server";
import { splitFullName } from "@/lib/format-person-name";
import { getFreshCandidateResumeUrl } from "@/server/services/resume-ats-check";
import type { SessionUser } from "@/lib/auth/session";

export type UserProfile = SessionUser & {
  firstName: string;
  lastName: string;
  education: string;
  careerGoals: string;
  linkedinUrl: string;
  experienceYears: number | null;
  gender: string;
  graduationCollege: string;
  graduationYear: number | null;
  specialization: string;
  workExperience: string;
  hasResume: boolean;
  resumePreviewUrl: string | null;
  resumeFileName: string | null;
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
    .select("name, email, first_name, last_name, member_id")
    .eq("id", userId)
    .single();

  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select(
      "education, career_goals, linkedin_url, experience_years, gender, graduation_college, graduation_year, specialization, work_experience, resume_url",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const freshResume = await getFreshCandidateResumeUrl(userId);

  const name = dbUser?.name ?? undefined;
  const split = splitFullName(name);
  const firstName = dbUser?.first_name?.trim() || split.firstName;
  const lastName = dbUser?.last_name?.trim() || split.lastName;

  const avatarUrl =
    typeof authData.user.user_metadata?.avatar_url === "string"
      ? authData.user.user_metadata.avatar_url
      : undefined;

  return {
    id: userId,
    email: dbUser?.email ?? authData.user.email,
    name: name ?? (firstName || lastName ? `${firstName} ${lastName}`.trim() : undefined),
    memberId: dbUser?.member_id ?? null,
    avatarUrl,
    firstName,
    lastName,
    education: candidateProfile?.education ?? "",
    careerGoals: candidateProfile?.career_goals ?? "",
    linkedinUrl: candidateProfile?.linkedin_url ?? "",
    experienceYears: candidateProfile?.experience_years ?? null,
    gender: candidateProfile?.gender ?? "",
    graduationCollege: candidateProfile?.graduation_college ?? "",
    graduationYear: candidateProfile?.graduation_year ?? null,
    specialization: candidateProfile?.specialization ?? "",
    workExperience: candidateProfile?.work_experience ?? "",
    hasResume: Boolean(candidateProfile?.resume_url) || Boolean(freshResume),
    resumePreviewUrl: freshResume?.resumeUrl ?? null,
    resumeFileName: freshResume?.fileName ?? null,
  };
}
