import { Resend } from "resend";
import { createAdminClient } from "@/server/db/supabase-admin";
import {
  buildEmailLogoHtml,
  getCandidateInviteLogoAttachment,
} from "@/server/services/email-logo";

export const CANDIDATE_WELCOME_SUBJECT = "Welcome to Jobilly — your career journey starts here";

function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
}

function buildWelcomeHtml(input: {
  firstName: string;
  dashboardUrl: string;
  productsUrl: string;
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
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 32px 12px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);">
                ${logoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1877f2;">
                  Welcome
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25;color:#0a1628;font-weight:800;">
                  Hi ${input.firstName}, welcome to Jobilly
                </h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#374151;">
                  Your account is ready. Jobilly helps you go from graduation to your first job with
                  free career advisory, a candidate portal, and optional plans for mock interviews
                  and managed job applications.
                </p>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#374151;">
                  Start by opening your dashboard to book a career advisory session and complete your profile.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:28px 32px 12px;">
                <a href="${input.dashboardUrl}"
                   style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:16px;font-weight:700;padding:14px 28px;border-radius:12px;margin-right:12px;">
                  Open dashboard
                </a>
                <a href="${input.productsUrl}"
                   style="display:inline-block;color:#1877f2;text-decoration:none;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-size:15px;font-weight:700;padding:14px 8px;">
                  View plans
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
                  Questions? Reply to this email or visit our contact page — we're glad you're here.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

export async function sendCandidateWelcomeEmail(input: {
  userId: string;
  email: string;
  recipientName: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { sent: false, error: "Missing recipient email." };
  }

  const admin = createAdminClient();

  await admin.from("candidate_profiles").upsert(
    { user_id: input.userId },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  const { data: profile, error: profileError } = await admin
    .from("candidate_profiles")
    .select("welcome_email_sent_at")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (profileError) {
    console.error("sendCandidateWelcomeEmail: profile lookup failed", profileError);
    return { sent: false, error: profileError.message };
  }

  if (profile?.welcome_email_sent_at) {
    return { sent: false, skipped: true };
  }

  const firstName =
    input.recipientName.trim().split(/\s+/)[0] || "there";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const dashboardUrl = `${appUrl}/dashboard`;
  const productsUrl = `${appUrl}/products`;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const logoAttachment = getCandidateInviteLogoAttachment();
  const hasLogo = Boolean(logoAttachment);

  if (!resendApiKey) {
    console.log("[welcome-email] Dev — no RESEND_API_KEY:");
    console.log(`  To: ${email}`);
    console.log(`  Name: ${firstName}`);
    console.log(`  Dashboard: ${dashboardUrl}`);
  } else {
    const resend = new Resend(resendApiKey);
    const attachments = logoAttachment ? [logoAttachment] : undefined;
    const { error } = await resend.emails.send({
      from: resendFromAddress(),
      to: [email],
      subject: CANDIDATE_WELCOME_SUBJECT,
      html: buildWelcomeHtml({
        firstName,
        dashboardUrl,
        productsUrl,
        hasLogo,
      }),
      attachments,
    });

    if (error) {
      console.error("Resend candidate welcome email error:", error);
      return { sent: false, error: error.message };
    }
  }

  const sentAt = new Date().toISOString();
  const { error: updateError } = await admin
    .from("candidate_profiles")
    .update({ welcome_email_sent_at: sentAt })
    .eq("user_id", input.userId);

  if (updateError) {
    console.error("sendCandidateWelcomeEmail: could not mark sent", updateError);
  }

  return { sent: true };
}
