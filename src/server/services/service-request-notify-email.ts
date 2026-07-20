import { Resend } from "resend";
import type { ServiceRequestType } from "@/server/services/service-requests";

type NotifyManagerInput = {
  requestId: string;
  requestType?: ServiceRequestType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  enquiry: string;
  managerEmails: string[];
};

function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
}

function buildHtml(input: NotifyManagerInput, adminUrl: string): string {
  const isNewCandidate = input.requestType === "new_candidate";
  const isCareerAdvisory = input.requestType === "career_advisory";
  const title = isNewCandidate
    ? "New candidate signup"
    : isCareerAdvisory
      ? "Career advisory booking"
      : "New service request";
  const intro = isNewCandidate
    ? "A candidate just signed up on Jobilly.ai. Assign a mentor admin to support their job search and applications."
    : isCareerAdvisory
      ? "A candidate booked a career advisory session but does not have a mentor assigned yet."
      : "A visitor submitted the contact form on Jobilly.ai.";

  return `
    <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0a1628;max-width:560px;">
      <h1 style="font-size:22px;margin-bottom:12px;">${title}</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;">
        ${intro}
      </p>
      <ul style="font-size:14px;line-height:1.7;color:#374151;padding-left:20px;">
        <li><strong>Name:</strong> ${input.firstName} ${input.lastName}</li>
        <li><strong>Email:</strong> ${input.email}</li>
        ${isNewCandidate ? "" : `<li><strong>Phone:</strong> ${input.phone}</li>`}
      </ul>
      <p style="font-size:14px;line-height:1.7;color:#374151;"><strong>Details:</strong></p>
      <p style="font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap;">${input.enquiry}</p>
      <p style="margin:24px 0;">
        <a href="${adminUrl}" style="display:inline-block;background:#1877f2;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">
          Assign mentor in admin portal
        </a>
      </p>
    </div>`;
}

export async function notifyManagersOfServiceRequest(
  input: NotifyManagerInput,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey || input.managerEmails.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[service-request] New request (no Resend/managers):", input);
    }
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const adminUrl = `${appUrl}/admin/requests`;
  const isNewCandidate = input.requestType === "new_candidate";
  const isCareerAdvisory = input.requestType === "career_advisory";
  const subject = isNewCandidate
    ? `New candidate signup — assign mentor for ${input.firstName} ${input.lastName}`
    : isCareerAdvisory
      ? `Career advisory booking — assign mentor for ${input.firstName} ${input.lastName}`
      : `New contact request — ${input.firstName} ${input.lastName}`;

  const resend = new Resend(resendApiKey);
  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: input.managerEmails,
    subject,
    html: buildHtml(input, adminUrl),
  });

  if (error) {
    console.error("Resend service request notify error:", error);
  }
}
