import { Resend } from "resend";
import { formatDisplayName } from "@/lib/format-display-name";
import {
  buildEmailLogoHtml,
  getCandidateInviteLogoAttachment,
} from "@/server/services/email-logo";

export type DailyApplicationsDigestJob = {
  company: string;
  role: string;
};

export type SendDailyApplicationsDigestEmailInput = {
  recipientEmail: string;
  recipientName: string;
  jobs: DailyApplicationsDigestJob[];
  portalUrl: string;
};

export type SendDailyApplicationsDigestEmailResult =
  | { sent: true }
  | { sent: false; skipped: true }
  | { sent: false; error: string };

const PREVIEW_JOB_COUNT = 3;

function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
}

export function isDailyApplicationsDigestEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDailyApplicationsDigestSubject(jobCount: number): string {
  const label = jobCount === 1 ? "1 application" : `${jobCount} applications`;
  return `Your Jobilly update — ${label} submitted`;
}

export function buildDailyApplicationsDigestHtml(input: {
  recipientName: string;
  jobs: DailyApplicationsDigestJob[];
  portalUrl: string;
  hasLogo: boolean;
}): string {
  const firstName =
    input.recipientName.trim().split(/\s+/)[0] || input.recipientName || "there";
  const totalCount = input.jobs.length;
  const previewJobs = input.jobs.slice(0, PREVIEW_JOB_COUNT);
  const remainingCount = Math.max(0, totalCount - previewJobs.length);

  const logoHtml = buildEmailLogoHtml(input.hasLogo, "header");

  const jobRows = previewJobs
    .map(
      (job) => `
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #eef2f7;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a1628;">${escapeHtml(job.role)}</p>
            <p style="margin:0;font-size:14px;color:#6b7280;">${escapeHtml(job.company)}</p>
          </td>
        </tr>
      `,
    )
    .join("");

  const seeMoreHtml =
    remainingCount > 0
      ? `
        <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#374151;text-align:center;">
          and ${remainingCount} more ${remainingCount === 1 ? "role" : "roles"} in your portal
        </p>
      `
      : "";

  const countLabel =
    totalCount === 1
      ? "Our team submitted <strong>1 application</strong> on your behalf."
      : `Our team submitted <strong>${totalCount} applications</strong> on your behalf.`;

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
                  Application update
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#0a1628;font-weight:800;">
                  Hi ${escapeHtml(firstName)}, here&apos;s your daily summary
                </h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">
                  ${countLabel}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fbff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden;">
                  ${jobRows}
                </table>
                ${seeMoreHtml}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 32px 28px;">
                <a href="${input.portalUrl}"
                   style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:16px;font-weight:700;padding:15px 28px;border-radius:12px;box-shadow:0 8px 24px rgba(24,119,242,0.28);">
                  ${remainingCount > 0 ? "See more in your portal" : "View in your portal"}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
                  Open your candidate portal for full job descriptions, company details, and interview prep tips.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 30px;border-top:1px solid #eef2f7;background:#fafcff;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a1628;">Warm regards,</p>
                <p style="margin:0;font-size:14px;color:#374151;">The Jobilly AI Team</p>
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

export function resolveDigestRecipientName(user: {
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  const combined = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (combined) {
    return formatDisplayName(combined);
  }
  if (user.name?.trim()) {
    return formatDisplayName(user.name);
  }
  return formatDisplayName(user.email.split("@")[0] ?? user.email);
}

export async function sendDailyApplicationsDigestEmail(
  input: SendDailyApplicationsDigestEmailInput,
): Promise<SendDailyApplicationsDigestEmailResult> {
  if (!isDailyApplicationsDigestEnabled()) {
    return { sent: false, skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!.trim());
  const logoAttachment = getCandidateInviteLogoAttachment();
  const hasLogo = logoAttachment !== null;
  const subject = buildDailyApplicationsDigestSubject(input.jobs.length);

  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: input.recipientEmail,
    subject,
    html: buildDailyApplicationsDigestHtml({
      recipientName: input.recipientName,
      jobs: input.jobs,
      portalUrl: input.portalUrl,
      hasLogo,
    }),
    attachments: logoAttachment ? [logoAttachment] : undefined,
  });

  if (error) {
    return { sent: false, error: error.message };
  }

  return { sent: true };
}
