import { Resend } from "resend";
import {
  buildCareerAdvisoryIcsInvite,
  formatSessionDateTime,
  getSessionEndTime,
} from "@/server/services/career-advisory-invite";
import {
  buildCandidateInviteHtml,
  CANDIDATE_INVITE_SUBJECT,
  getCandidateInviteLogoAttachment,
} from "@/server/services/career-advisory-candidate-email";
import { createAdminClient } from "@/server/db/supabase-admin";

export type SendMentorMeetingLinkInput = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  meetUrl: string;
  sessionScheduledAt: string;
  mentorEmail?: string | null;
};

export type SendMentorMeetingLinkResult =
  | {
      success: true;
      meetUrl: string;
      sessionScheduledAt: string;
      inviteSentAt: string;
    }
  | { error: string };

export function normalizeGoogleMeetUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes("meet.google.com")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getDefaultGoogleMeetUrl(): string | null {
  const configured = process.env.CAREER_ADVISORY_GOOGLE_MEET_URL?.trim();
  if (!configured) {
    return null;
  }
  return normalizeGoogleMeetUrl(configured);
}

export async function sendMentorMeetingLink(
  input: SendMentorMeetingLinkInput,
): Promise<SendMentorMeetingLinkResult> {
  const meetUrl = normalizeGoogleMeetUrl(input.meetUrl);
  if (!meetUrl) {
    return { error: "Enter a valid Google Meet link (meet.google.com)." };
  }

  const sessionStart = new Date(input.sessionScheduledAt);
  if (Number.isNaN(sessionStart.getTime())) {
    return { error: "Choose a valid session date and time." };
  }

  const sessionEnd = getSessionEndTime(sessionStart);
  const inviteSentAt = new Date().toISOString();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
  const organizerEmail =
    input.mentorEmail?.trim() ||
    process.env.CAREER_ADVISORY_ORGANIZER_EMAIL?.trim() ||
    fromEmail;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  const icsContent = buildCareerAdvisoryIcsInvite({
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    meetUrl,
    sessionStart,
    sessionEnd,
    organizerEmail,
  });

  const logoAttachment = getCandidateInviteLogoAttachment();
  const inviteAttachment = {
    filename: "jobilly-career-advisory.ics",
    content: Buffer.from(icsContent).toString("base64"),
  };
  const candidateAttachments = logoAttachment
    ? [inviteAttachment, logoAttachment]
    : [inviteAttachment];

  if (!resendApiKey) {
    console.log("[mentor-meeting-link] Invite (no RESEND_API_KEY):");
    console.log(`  Candidate: ${input.candidateEmail}`);
    console.log(`  When: ${formatSessionDateTime(sessionStart)}`);
    console.log(`  Meet: ${meetUrl}`);
  } else {
    const resend = new Resend(resendApiKey);
    const { error: candidateError } = await resend.emails.send({
      from: fromEmail,
      to: [input.candidateEmail],
      replyTo: organizerEmail,
      subject: CANDIDATE_INVITE_SUBJECT,
      html: buildCandidateInviteHtml({
        recipientName: input.candidateName,
        meetUrl,
        sessionStart,
        hasLogo: Boolean(logoAttachment),
      }),
      attachments: candidateAttachments,
    });

    if (candidateError) {
      console.error("Resend mentor meeting link error:", candidateError);
      const message =
        candidateError.message || "Could not send the meeting link email.";
      const hint =
        message.includes("domain is not verified") ||
        message.includes("verify a domain")
          ? " Verify jobilly.ai at https://resend.com/domains."
          : "";
      return { error: message + hint };
    }
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("career_advisory_intakes")
    .select("phone, graduation_details, branch, interested_technology")
    .eq("candidate_id", input.candidateId)
    .maybeSingle();

  const intakePayload = {
    candidate_id: input.candidateId,
    name: input.candidateName,
    email: input.candidateEmail,
    phone: existing?.phone ?? "—",
    graduation_details: existing?.graduation_details ?? "Not provided",
    branch: existing?.branch ?? "Not provided",
    interested_technology: existing?.interested_technology ?? "Not provided",
    google_meet_link: meetUrl,
    session_scheduled_at: sessionStart.toISOString(),
    invite_sent_at: inviteSentAt,
    updated_at: inviteSentAt,
  };

  const { error: upsertError } = await admin
    .from("career_advisory_intakes")
    .upsert(intakePayload, { onConflict: "candidate_id" });

  if (upsertError) {
    console.error("career_advisory_intakes upsert after mentor invite:", upsertError);
    return {
      error:
        "The email was sent, but the meeting link could not be saved. Refresh and try again.",
    };
  }

  return {
    success: true,
    meetUrl,
    sessionScheduledAt: sessionStart.toISOString(),
    inviteSentAt,
  };
}
