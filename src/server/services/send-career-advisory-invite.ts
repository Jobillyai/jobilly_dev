import { Resend } from "resend";
import {
  buildCareerAdvisoryIcsInvite,
  formatSessionDateTime,
  getSessionEndTime,
} from "@/server/services/career-advisory-invite";
import { validateSessionBookingTime } from "@/lib/career-advisory/booking-window";
import {
  buildCandidateInviteHtml,
  CANDIDATE_INVITE_SUBJECT,
  getCandidateInviteLogoAttachment,
} from "@/server/services/career-advisory-candidate-email";

export type SendMeetInviteInput = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  branch: string;
  graduationDetails: string;
  interestedTechnology: string;
  sessionScheduledAt: string;
};

export type SendMeetInviteResult =
  | {
      sent: true;
      meetUrl: string;
      sessionScheduledAt: string;
      devMode?: boolean;
    }
  | {
      sent: false;
      skipped: true;
    }
  | {
      sent: false;
      error: string;
    };

export function isCareerAdvisoryInviteEnabled(): boolean {
  if (process.env.CAREER_ADVISORY_INVITES_ENABLED === "false") {
    return false;
  }

  return Boolean(getMeetUrl());
}

function getMeetUrl(): string | null {
  const meetUrl = process.env.CAREER_ADVISORY_GOOGLE_MEET_URL?.trim();
  if (!meetUrl) {
    return null;
  }

  try {
    const parsed = new URL(meetUrl);
    if (!parsed.hostname.includes("meet.google.com")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function buildOrganizerBookingHtml(input: {
  organizerName: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  branch: string;
  graduationDetails: string;
  interestedTechnology: string;
  meetUrl: string;
  sessionStart: Date;
  adminCandidateUrl: string;
  adminCalendarUrl: string;
}): string {
  const when = formatSessionDateTime(input.sessionStart);

  return `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #0a1628; max-width: 560px; margin: 0 auto;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">New career advisory booking</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        Hi ${input.organizerName},
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        <strong>${input.candidateName}</strong> has booked a career advisory session on Jobilly.ai.
      </p>
      <ul style="font-size: 14px; line-height: 1.7; color: #374151; padding-left: 20px; margin: 20px 0;">
        <li><strong>Candidate:</strong> ${input.candidateName}</li>
        <li><strong>Email:</strong> ${input.candidateEmail}</li>
        <li><strong>Phone:</strong> ${input.candidatePhone}</li>
        <li><strong>Branch:</strong> ${input.branch}</li>
        <li><strong>Graduation:</strong> ${input.graduationDetails}</li>
        <li><strong>Technology:</strong> ${input.interestedTechnology}</li>
        <li><strong>Session:</strong> ${when}</li>
      </ul>
      <p style="margin: 28px 0;">
        <a href="${input.meetUrl}"
           style="display: inline-block; background: #1877f2; color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 24px; border-radius: 12px;">
          Join Google Meet
        </a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
        Meet link: <a href="${input.meetUrl}" style="color: #1877f2;">${input.meetUrl}</a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin-top: 16px;">
        A calendar invite (.ics) is attached — add it to your calendar in one click.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #374151; margin-top: 24px;">
        This booking is also recorded in the admin portal:
      </p>
      <p style="margin: 16px 0;">
        <a href="${input.adminCandidateUrl}"
           style="display: inline-block; margin-right: 12px; color: #1877f2; font-weight: 700;">
          View candidate
        </a>
        <a href="${input.adminCalendarUrl}" style="color: #1877f2; font-weight: 700;">
          Open admin calendar
        </a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin-top: 24px;">
        — Jobilly.ai Admin
      </p>
    </div>
  `;
}

function organizerDisplayName(email: string): string {
  const local = email.split("@")[0] ?? "Advisor";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function sendCareerAdvisoryMeetInvite(
  input: SendMeetInviteInput,
): Promise<SendMeetInviteResult> {
  if (!isCareerAdvisoryInviteEnabled()) {
    return { sent: false, skipped: true };
  }

  const meetUrl = getMeetUrl();
  if (!meetUrl) {
    return {
      sent: false,
      error: "Google Meet link is not configured.",
    };
  }
  const meetLink = meetUrl;

  const sessionStart = new Date(input.sessionScheduledAt);
  const bookingValidation = validateSessionBookingTime(sessionStart);
  if (!bookingValidation.valid) {
    return {
      sent: false,
      error: bookingValidation.message,
    };
  }

  const sessionEnd = getSessionEndTime(sessionStart);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
  const organizerEmail =
    process.env.CAREER_ADVISORY_ORGANIZER_EMAIL?.trim() ??
    "avinashprince812@gmail.com";
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  const icsContent = buildCareerAdvisoryIcsInvite({
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    meetUrl: meetLink,
    sessionStart,
    sessionEnd,
    organizerEmail,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const adminCandidateUrl = `${appUrl}/admin/candidates#candidate-${input.candidateId}`;
  const adminCalendarUrl = `${appUrl}/admin/calendar`;

  if (!resendApiKey) {
    console.log("[career-advisory] Meet invite (dev — no RESEND_API_KEY):");
    console.log(`  Candidate: ${input.candidateEmail}`);
    console.log(`  Organizer: ${organizerEmail}`);
    console.log(`  When: ${formatSessionDateTime(sessionStart)}`);
    console.log(`  Meet: ${meetLink}`);
    console.log(`  Admin: ${adminCalendarUrl}`);
    return {
      sent: true,
      meetUrl: meetLink,
      sessionScheduledAt: sessionStart.toISOString(),
      devMode: true,
    };
  }

  const resend = new Resend(resendApiKey);
  const logoAttachment = getCandidateInviteLogoAttachment();
  const inviteAttachment = {
    filename: "jobilly-career-advisory.ics",
    content: Buffer.from(icsContent).toString("base64"),
  };
  const candidateAttachments = logoAttachment
    ? [inviteAttachment, logoAttachment]
    : [inviteAttachment];

  const { error: candidateError } = await resend.emails.send({
    from: fromEmail,
    to: [input.candidateEmail],
    replyTo: organizerEmail,
    subject: CANDIDATE_INVITE_SUBJECT,
    html: buildCandidateInviteHtml({
      recipientName: input.candidateName,
      meetUrl: meetLink,
      sessionStart,
      hasLogo: Boolean(logoAttachment),
    }),
    attachments: candidateAttachments,
  });

  if (candidateError) {
    console.error("Resend career advisory invite error:", candidateError);
    const message =
      candidateError.message || "Could not send the Google Meet invite email.";
    const hint =
      message.includes("domain is not verified") ||
      message.includes("verify a domain")
        ? " Verify jobilly.ai at https://resend.com/domains."
        : "";
    return {
      sent: false,
      error: message + hint,
    };
  }

  if (organizerEmail.toLowerCase() !== input.candidateEmail.toLowerCase()) {
    const { error: organizerError } = await resend.emails.send({
      from: fromEmail,
      to: [organizerEmail],
      subject: `Career advisory booked — ${input.candidateName}`,
      html: buildOrganizerBookingHtml({
        organizerName: organizerDisplayName(organizerEmail),
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidatePhone: input.candidatePhone,
        branch: input.branch,
        graduationDetails: input.graduationDetails,
        interestedTechnology: input.interestedTechnology,
        meetUrl: meetLink,
        sessionStart,
        adminCandidateUrl,
        adminCalendarUrl,
      }),
      attachments: [inviteAttachment],
    });

    if (organizerError) {
      console.error("Resend organizer booking email error:", organizerError);
    }
  }

  return {
    sent: true,
    meetUrl: meetLink,
    sessionScheduledAt: sessionStart.toISOString(),
  };
}
