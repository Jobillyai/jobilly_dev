import { Resend } from "resend";
import { getPublicAppOrigin } from "@/lib/auth/app-origin";
import { formatSessionDateTimeForCandidate } from "@/lib/career-advisory/session-datetime";
import { formatSessionDateTimeForStaffHtml } from "@/server/services/career-advisory-invite";
import {
  buildEmailLogoHtml,
  getCandidateInviteLogoAttachment,
} from "@/server/services/email-logo";
import { listManagerEmails } from "@/server/services/service-requests";

export const CANDIDATE_ACK_SUBJECT =
  "We received your Jobilly Career Advisory request";

export type SendAdvisoryAckInput = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  branch: string;
  graduationDetails: string;
  interestedTechnology: string;
  sessionScheduledAt: string;
};

export type SendAdvisoryAckResult =
  | { sent: true }
  | { sent: false; error: string };

function buildCandidateAckHtml(input: {
  recipientName: string;
  sessionStart: Date;
  hasLogo: boolean;
}): string {
  const when = formatSessionDateTimeForCandidate(input.sessionStart);
  const firstName = input.recipientName.trim().split(/\s+/)[0] || input.recipientName;
  const logoHtml = buildEmailLogoHtml(input.hasLogo, "header");
  const footerLogoHtml = buildEmailLogoHtml(input.hasLogo, "footer");

  return `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f0f6ff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f6ff;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 8px 32px rgba(10,22,40,0.06);">
            <tr>
              <td style="padding:28px 32px 12px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);">
                ${logoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1877f2;">
                  Submission received
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#0a1628;font-weight:800;">
                  Thank you, ${firstName} — we've got your details
                </h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">
                  Your career advisory request has been received. One of our mentors will talk
                  to you at your chosen time — we're matching you with the right mentor now.
                </p>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#374151;">
                  Your session is scheduled for <strong style="color:#0a1628;">${when}</strong> (US Eastern Time).
                  You'll receive a follow-up email with your mentor's Google Meet link before the session.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fbff;border:1px solid #dbeafe;border-radius:16px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">
                        Session details
                      </p>
                      <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#0a1628;"><strong>Date &amp; time:</strong> ${when}</p>
                      <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#0a1628;"><strong>Format:</strong> Google Meet (online)</p>
                      <p style="margin:0;font-size:15px;line-height:1.6;color:#0a1628;"><strong>Meet link:</strong> Sent once your mentor is confirmed</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
                  No action needed from you right now. If you need to change your session time,
                  update your submission from the career advisory page in your dashboard.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 30px;border-top:1px solid #eef2f7;background:#fafcff;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-right:14px;vertical-align:middle;">
                      ${footerLogoHtml}
                    </td>
                    <td style="vertical-align:middle;">
                      <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a1628;">Warm regards,</p>
                      <p style="margin:0 0 4px;font-size:14px;color:#374151;">The Jobilly AI Team</p>
                      <p style="margin:0;font-size:13px;color:#6b7280;">From graduation to your first job — guided by AI.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function buildManagerNeedsMentorHtml(input: {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  branch: string;
  graduationDetails: string;
  interestedTechnology: string;
  sessionStart: Date;
  adminCandidateUrl: string;
}): string {
  const when = formatSessionDateTimeForStaffHtml(input.sessionStart);

  return `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #0a1628; max-width: 560px; margin: 0 auto;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">Career advisory booked — mentor needed</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        <strong>${input.candidateName}</strong> booked a career advisory session but has no mentor
        assigned yet. Assign a mentor so the Google Meet link can be sent before the session.
      </p>
      <ul style="font-size: 14px; line-height: 1.7; color: #374151; padding-left: 20px; margin: 20px 0;">
        <li><strong>Candidate:</strong> ${input.candidateName}</li>
        <li><strong>Email:</strong> ${input.candidateEmail}</li>
        <li><strong>Phone:</strong> ${input.candidatePhone}</li>
        <li><strong>Branch:</strong> ${input.branch}</li>
        <li><strong>Highest degree:</strong> ${input.graduationDetails}</li>
        <li><strong>Technology:</strong> ${input.interestedTechnology}</li>
      </ul>
      <div style="font-size: 14px; line-height: 1.7; color: #374151; margin: 0 0 20px; padding-left: 20px;">
        <p style="margin:0 0 8px;font-weight:700;">Session</p>
        ${when}
      </div>
      <p style="margin: 24px 0;">
        <a href="${input.adminCandidateUrl}"
           style="display: inline-block; background: #1877f2; color: #ffffff; text-decoration: none; font-weight: 700; padding: 14px 24px; border-radius: 12px;">
          Assign a mentor
        </a>
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin-top: 24px;">
        — Jobilly.ai Admin
      </p>
    </div>
  `;
}

/**
 * Sent when a candidate submits career advisory but no mentor is assigned yet:
 * the candidate gets a "we received it, a mentor will talk to you then" email
 * (no Meet link), and managers are asked to assign a mentor.
 */
export async function sendCareerAdvisorySubmissionAck(
  input: SendAdvisoryAckInput,
): Promise<SendAdvisoryAckResult> {
  const sessionStart = new Date(input.sessionScheduledAt);
  if (Number.isNaN(sessionStart.getTime())) {
    return { sent: false, error: "Invalid session time." };
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const appUrl = getPublicAppOrigin();
  const adminCandidateUrl = `${appUrl}/admin/candidates#candidate-${input.candidateId}`;
  const logoAttachment = getCandidateInviteLogoAttachment();

  if (!resendApiKey) {
    console.log("[career-advisory] Submission ack (dev — no RESEND_API_KEY):");
    console.log(`  Candidate: ${input.candidateEmail}`);
    console.log(`  When: ${formatSessionDateTimeForCandidate(sessionStart)}`);
    return { sent: true };
  }

  const resend = new Resend(resendApiKey);
  const { error: candidateError } = await resend.emails.send({
    from: fromEmail,
    to: [input.candidateEmail],
    subject: CANDIDATE_ACK_SUBJECT,
    html: buildCandidateAckHtml({
      recipientName: input.candidateName,
      sessionStart,
      hasLogo: Boolean(logoAttachment),
    }),
    attachments: logoAttachment ? [logoAttachment] : undefined,
  });

  if (candidateError) {
    console.error("Resend advisory submission ack error:", candidateError);
    return {
      sent: false,
      error: candidateError.message || "Could not send the confirmation email.",
    };
  }

  const managerEmails = await listManagerEmails();
  const organizerEmail = process.env.CAREER_ADVISORY_ORGANIZER_EMAIL?.trim();
  const staffRecipients = managerEmails.length
    ? managerEmails
    : organizerEmail
      ? [organizerEmail]
      : [];

  if (staffRecipients.length > 0) {
    const { error: staffError } = await resend.emails.send({
      from: fromEmail,
      to: staffRecipients,
      subject: `Mentor needed — career advisory booked by ${input.candidateName}`,
      html: buildManagerNeedsMentorHtml({
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidatePhone: input.candidatePhone,
        branch: input.branch,
        graduationDetails: input.graduationDetails,
        interestedTechnology: input.interestedTechnology,
        sessionStart,
        adminCandidateUrl,
      }),
    });

    if (staffError) {
      console.error("Resend manager mentor-needed email error:", staffError);
    }
  }

  return { sent: true };
}
