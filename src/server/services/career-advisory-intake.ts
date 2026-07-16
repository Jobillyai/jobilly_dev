import { createClient } from "@/server/db/supabase-server";
import type { SessionCalendarEvent } from "@/components/calendar/session-month-calendar";

export type CandidateCareerAdvisoryIntake = {
  name: string;
  email: string;
  phone: string;
  graduationDetails: string;
  branch: string;
  isVeteran: boolean;
  interestedTechnology: string;
  inviteSentAt: string | null;
  sessionScheduledAt: string | null;
  googleMeetLink: string | null;
  candidateSubmittedAt: string;
  bookedAt: string;
  updatedAt: string;
};

type IntakeRow = {
  name: string;
  email: string;
  phone: string;
  graduation_details: string;
  branch: string;
  is_veteran: boolean;
  interested_technology: string;
  invite_sent_at: string | null;
  session_scheduled_at: string | null;
  google_meet_link: string | null;
  candidate_submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapIntakeRow(data: IntakeRow): CandidateCareerAdvisoryIntake {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    graduationDetails: data.graduation_details,
    branch: data.branch,
    isVeteran: data.is_veteran,
    interestedTechnology: data.interested_technology,
    inviteSentAt: data.invite_sent_at,
    sessionScheduledAt: data.session_scheduled_at,
    googleMeetLink: data.google_meet_link,
    candidateSubmittedAt: data.candidate_submitted_at ?? data.updated_at,
    bookedAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

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
      "name, email, phone, graduation_details, branch, is_veteran, interested_technology, invite_sent_at, session_scheduled_at, google_meet_link, candidate_submitted_at, created_at, updated_at",
    )
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapIntakeRow(data as IntakeRow);
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
