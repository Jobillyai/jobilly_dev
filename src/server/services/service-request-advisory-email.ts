import { Resend } from "resend";
import { getPublicAppOrigin } from "@/lib/auth/app-origin";
import { formatSessionDateTimeFromIso } from "@/lib/career-advisory/session-datetime";
import { listManagerEmails } from "@/server/services/service-requests";

function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyManagersOfAdvisoryMeetingRemarks(input: {
  candidateName: string;
  candidateEmail: string;
  mentorName: string;
  mentorEmail: string;
  sessionScheduledAt: string | null;
  remarks: string;
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const managerEmails = await listManagerEmails();

  if (!resendApiKey || managerEmails.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[service-request] Advisory remarks (no Resend/managers):", input);
    }
    return;
  }

  const sessionLabel = input.sessionScheduledAt
    ? formatSessionDateTimeFromIso(input.sessionScheduledAt, "staff") ??
      input.sessionScheduledAt
    : "Not recorded";

  const appUrl = getPublicAppOrigin();
  const html = `
    <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0a1628;max-width:560px;">
      <h1 style="font-size:22px;margin-bottom:12px;">Career advisory session completed</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;">
        ${escapeHtml(input.mentorName)} submitted meeting remarks for a career advisory session.
      </p>
      <ul style="font-size:14px;line-height:1.7;color:#374151;padding-left:20px;">
        <li><strong>Candidate:</strong> ${escapeHtml(input.candidateName)} (${escapeHtml(input.candidateEmail)})</li>
        <li><strong>Session:</strong> ${escapeHtml(sessionLabel)}</li>
        <li><strong>Mentor:</strong> ${escapeHtml(input.mentorName)} (${escapeHtml(input.mentorEmail)})</li>
      </ul>
      <p style="font-size:14px;line-height:1.7;color:#374151;"><strong>Meeting remarks:</strong></p>
      <p style="font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;">${escapeHtml(input.remarks)}</p>
      <p style="margin:24px 0;">
        <a href="${appUrl}/admin/requests" style="display:inline-block;background:#1877f2;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">
          View service requests
        </a>
      </p>
    </div>`;

  const resend = new Resend(resendApiKey);
  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: managerEmails,
    subject: `Advisory remarks — ${input.candidateName}`,
    html,
  });

  if (error) {
    console.error("Resend advisory remarks notify error:", error);
  }
}
