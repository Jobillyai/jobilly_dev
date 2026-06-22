import { createClient } from "@/server/db/supabase-server";

export type CandidateCareerAdvisoryIntake = {
  name: string;
  email: string;
  inviteSentAt: string | null;
  sessionScheduledAt: string | null;
  googleMeetLink: string | null;
};

export async function getCareerAdvisoryIntakeForCandidate(
  candidateId: string,
): Promise<CandidateCareerAdvisoryIntake | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("career_advisory_intakes")
    .select("name, email, invite_sent_at, session_scheduled_at, google_meet_link")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    name: data.name,
    email: data.email,
    inviteSentAt: data.invite_sent_at,
    sessionScheduledAt: data.session_scheduled_at,
    googleMeetLink: data.google_meet_link,
  };
}
