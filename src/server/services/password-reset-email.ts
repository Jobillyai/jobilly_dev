import { Resend } from "resend";
import { getPublicAppOrigin } from "@/lib/auth/app-origin";
import { createAdminClient } from "@/server/db/supabase-admin";
import {
  buildEmailLogoHtml,
  getCandidateInviteLogoAttachment,
} from "@/server/services/email-logo";

export const PASSWORD_RESET_SUBJECT = "Reset your Jobilly password";

export type SendPasswordResetEmailResult =
  | { sent: true; devMode?: boolean }
  | { sent: false; error: string };

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "there";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
}

export function buildPasswordResetEmailHtml(input: {
  recipientName: string;
  resetUrl: string;
  hasLogo: boolean;
}): string {
  const logoHtml = buildEmailLogoHtml(input.hasLogo, "header");

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
                  Password reset
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#0a1628;font-weight:800;">
                  Hi ${input.recipientName}, reset your password
                </h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">
                  We received a request to reset the password for your Jobilly account.
                  Click the button below to choose a new password. This link expires soon
                  and can only be used once.
                </p>
                <p style="margin:28px 0;">
                  <a href="${input.resetUrl}"
                     style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:12px;">
                    Reset password
                  </a>
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#6b7280;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;">
                  <a href="${input.resetUrl}" style="color:#1877f2;">${input.resetUrl}</a>
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#6b7280;">
                  If you did not request a password reset, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid #eef2f7;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
                  — The Jobilly.ai team
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function createRecoveryLink(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const appUrl = getPublicAppOrigin();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${appUrl}/auth/callback?type=recovery`,
    },
  });

  if (error) {
    console.error("generateLink error:", error);
    return null;
  }

  const tokenHash = data.properties?.hashed_token;
  if (tokenHash) {
    const params = new URLSearchParams({
      token_hash: tokenHash,
      type: "recovery",
    });
    return `${appUrl}/auth/callback?${params.toString()}`;
  }

  return data.properties?.action_link ?? null;
}

function formatResendError(message: string): string {
  if (
    message.includes("domain is not verified") ||
    message.includes("verify a domain")
  ) {
    return `${message} Verify your sending domain at https://resend.com/domains.`;
  }

  return message;
}

export async function sendPasswordResetEmail(
  email: string,
  recipientName?: string | null,
): Promise<SendPasswordResetEmailResult> {
  const resetUrl = await createRecoveryLink(email);

  if (!resetUrl) {
    return {
      sent: false,
      error: "Could not generate a password reset link. Please try again.",
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const displayName = recipientName?.trim() || displayNameFromEmail(email);

  if (!resendApiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[password-reset] Reset link for ${email}: ${resetUrl}`);
      return { sent: true, devMode: true };
    }

    return {
      sent: false,
      error: "Email service is not configured. Set RESEND_API_KEY.",
    };
  }

  const resend = new Resend(resendApiKey);
  const logoAttachment = getCandidateInviteLogoAttachment();
  const attachments = logoAttachment ? [logoAttachment] : undefined;

  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: [email],
    subject: PASSWORD_RESET_SUBJECT,
    html: buildPasswordResetEmailHtml({
      recipientName: displayName,
      resetUrl,
      hasLogo: Boolean(logoAttachment),
    }),
    attachments,
  });

  if (error) {
    console.error("Resend password reset email error:", error);
    return {
      sent: false,
      error: formatResendError(
        error.message || "Could not send the password reset email.",
      ),
    };
  }

  return { sent: true };
}
