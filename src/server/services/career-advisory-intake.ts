import { createClient } from "@/server/db/supabase-server";
import type { SessionCalendarEvent } from "@/components/calendar/session-month-calendar";

export type CandidateCareerAdvisoryIntake = {
  name: string;
  email: string;
  inviteSentAt: string | null;
  sessionScheduledAt: string | null;
  googleMeetLink: string | null;
  bookedAt: string;
};

function getSessionStatus(
  sessionScheduledAt: string | null,
  inviteSentAt: string | null,
): SessionCalendarEvent["status"] {
  if (!inviteSentAt) {
    return "pending";
  }

  if (!sessionScheduledAt) {
    return "invited";
  }

  const sessionTime = new Date(sessionScheduledAt).getTime();
  if (sessionTime >= Date.now()) {
    return "upcoming";
  }

  return "past";
}

export async function getCareerAdvisoryIntakeForCandidate(
  candidateId: string,
): Promise<CandidateCareerAdvisoryIntake | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("career_advisory_intakes")
    .select(
      "name, email, invite_sent_at, session_scheduled_at, google_meet_link, created_at",
    )
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
    bookedAt: data.created_at,
  };
}

export function mapIntakeToCalendarSessions(
  intake: CandidateCareerAdvisoryIntake | null,
): SessionCalendarEvent[] {
  if (!intake) {
    return [];
  }

  return [
    {
      id: "career-advisory",
      title: "Career Advisory",
      sessionScheduledAt: intake.sessionScheduledAt,
      bookedAt: intake.bookedAt,
      status: getSessionStatus(intake.sessionScheduledAt, intake.inviteSentAt),
      meetLink: intake.googleMeetLink,
    },
  ];
}
