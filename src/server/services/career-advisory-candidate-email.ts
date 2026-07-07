import { formatSessionDateTime } from "@/server/services/career-advisory-invite";
import {
  buildEmailLogoHtml,
  getCandidateInviteLogoAttachment,
} from "@/server/services/email-logo";

export { getCandidateInviteLogoAttachment };

export function buildCandidateInviteHtml(input: {
  recipientName: string;
  meetUrl: string;
  sessionStart: Date;
  hasLogo: boolean;
}): string {
  const when = formatSessionDateTime(input.sessionStart);
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
                  Career Advisory Invitation
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#0a1628;font-weight:800;">
                  Welcome, ${firstName} — your session is confirmed
                </h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">
                  We are truly excited to meet you. Thank you for sharing your background with Jobilly.ai —
                  this session is a dedicated space to talk about your goals, sharpen your direction, and
                  plan your next step toward your first role.
                </p>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#374151;">
                  Your Google Meet session is scheduled for <strong style="color:#0a1628;">${when}</strong>.
                  A calendar invite is attached so you can save it in one click.
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
                      <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#0a1628;"><strong>Date & time:</strong> ${when}</p>
                      <p style="margin:0;font-size:15px;line-height:1.6;color:#0a1628;"><strong>Format:</strong> Google Meet (online)</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 32px 28px;">
                <a href="${input.meetUrl}"
                   style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:16px;font-weight:700;padding:15px 28px;border-radius:12px;box-shadow:0 8px 24px rgba(24,119,242,0.28);">
                  Join Google Meet
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#6b7280;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;word-break:break-all;">
                  <a href="${input.meetUrl}" style="color:#1877f2;text-decoration:none;">${input.meetUrl}</a>
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

export const CANDIDATE_INVITE_SUBJECT =
  "You're invited — your Jobilly Career Advisory session is confirmed";
