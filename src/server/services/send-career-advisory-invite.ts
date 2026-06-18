import { Resend } from "resend";
import {
  buildCareerAdvisoryIcsInvite,
  formatSessionDateTime,
  getNextAdvisorySessionTime,
  getSessionEndTime,
} from "@/server/services/career-advisory-invite";

export type SendMeetInviteInput = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
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
      error: string;
    };

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

function buildInviteHtml(input: {
  candidateName: string;
  meetUrl: string;
  sessionStart: Date;
}): string {
  const when = formatSessionDateTime(input.sessionStart);

  return `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #0a1628; max-width: 560px; margin: 0 auto;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Your Career Advisory session is scheduled</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        Hi ${input.candidateName},
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        Thanks for submitting your career advisory form. Your Google Meet session is booked for
        <strong>${when}</strong>.
      </p>
      <p style="margin: 28px 0;">
        <a href="${input.meetUrl}"
           style="display: inline-block; background: #1877f2; color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 24px; border-radius: 12px;">
          Join Google Meet
        </a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
        A calendar invite is attached to this email. If the button does not work, use this link:
        <a href="${input.meetUrl}" style="color: #1877f2;">${input.meetUrl}</a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin-top: 24px;">
        — The Jobilly.ai team
      </p>
    </div>
  `;
}

export async function sendCareerAdvisoryMeetInvite(
  input: SendMeetInviteInput,
): Promise<SendMeetInviteResult> {
  const meetUrl = getMeetUrl();
  if (!meetUrl) {
    return {
      sent: false,
      error: "Google Meet link is not configured.",
    };
  }

  const sessionStart = getNextAdvisorySessionTime();
  const sessionEnd = getSessionEndTime(sessionStart);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
  const organizerEmail =
    process.env.CAREER_ADVISORY_ORGANIZER_EMAIL?.trim() ?? "info@jobilly.ai";
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

  if (!resendApiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("[career-advisory] Meet invite (dev — no RESEND_API_KEY):");
      console.log(`  To: ${input.candidateEmail}`);
      console.log(`  When: ${formatSessionDateTime(sessionStart)}`);
      console.log(`  Meet: ${meetUrl}`);
      return {
        sent: true,
        meetUrl,
        sessionScheduledAt: sessionStart.toISOString(),
        devMode: true,
      };
    }

    return {
      sent: false,
      error: "Email service is not configured.",
    };
  }

  const resend = new Resend(resendApiKey);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [input.candidateEmail],
    subject: "Your Jobilly Career Advisory Google Meet invite",
    html: buildInviteHtml({
      candidateName: input.candidateName,
      meetUrl,
      sessionStart,
    }),
    attachments: [
      {
        filename: "jobilly-career-advisory.ics",
        content: Buffer.from(icsContent).toString("base64"),
      },
    ],
  });

  if (error) {
    console.error("Resend career advisory invite error:", error);
    return {
      sent: false,
      error: error.message || "Could not send the Google Meet invite email.",
    };
  }

  return {
    sent: true,
    meetUrl,
    sessionScheduledAt: sessionStart.toISOString(),
  };
}
