import { Resend } from "resend";
import { getPublicAppOrigin } from "@/lib/auth/app-origin";
import { groupDailyActivityItems } from "@/lib/group-daily-activity";
import type { AdminDailyUpdate } from "@/server/services/admin-daily-updates";
import { listManagerEmails } from "@/server/services/service-requests";

function resendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>";
}

function formatWorkDate(workDate: string): string {
  const [year, month, day] = workDate.split("-").map(Number);
  if (!year || !month || !day) {
    return workDate;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function buildActivityList(update: AdminDailyUpdate): string {
  const { summary, items } = update.activitySnapshot;

  if (items.length === 0) {
    return `<p style="font-size:14px;color:#6b7280;">No tracked activity recorded for this day.</p>`;
  }

  const summaryLine = `
    <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 12px;">
      <strong>Summary:</strong>
      ${summary.jobsScraped} jobs found ·
      ${summary.applicationsSubmitted} applications ·
      ${summary.meetInvitesSent} invites sent ·
      ${summary.meetingsHeld} sessions held
    </p>`;

  const groups = groupDailyActivityItems(items);

  const listItems = groups
    .map(
      (group) =>
        `<li style="margin-bottom:8px;"><strong>${escapeHtml(group.badge)}:</strong> ${escapeHtml(group.label)}</li>`,
    )
    .join("");

  return `${summaryLine}<ul style="font-size:14px;line-height:1.6;color:#374151;padding-left:20px;margin:0;">${listItems}</ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(update: AdminDailyUpdate, adminUrl: string, isUpdate: boolean): string {
  const mentorLabel = update.employeeName?.trim() || update.employeeEmail;
  const title = isUpdate ? "Daily update revised" : "Daily mentor update";

  return `
    <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#0a1628;max-width:600px;">
      <h1 style="font-size:22px;margin-bottom:8px;">${title}</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
        <strong>${mentorLabel}</strong> submitted their work log for <strong>${formatWorkDate(update.workDate)}</strong>.
      </p>
      <h2 style="font-size:16px;margin:0 0 10px;">What they did today</h2>
      ${buildActivityList(update)}
      <h2 style="font-size:16px;margin:24px 0 10px;">Remarks</h2>
      <p style="font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap;margin:0;">${escapeHtml(update.remarks)}</p>
      <p style="margin:28px 0 0;">
        <a href="${adminUrl}" style="display:inline-block;background:#1877f2;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">
          View in admin portal
        </a>
      </p>
    </div>`;
}

export async function notifyManagersOfDailyUpdate(
  update: AdminDailyUpdate,
  isUpdate: boolean,
): Promise<void> {
  const managerEmails = await listManagerEmails();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!resendApiKey || managerEmails.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[daily-update] Manager notify (no Resend/managers):", update);
    }
    return;
  }

  const appUrl = getPublicAppOrigin();
  const adminUrl = `${appUrl}/admin/tasks`;
  const mentorLabel = update.employeeName?.trim() || update.employeeEmail;
  const subject = isUpdate
    ? `Updated daily log — ${mentorLabel} (${update.workDate})`
    : `Daily mentor log — ${mentorLabel} (${update.workDate})`;

  const resend = new Resend(resendApiKey);
  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: managerEmails,
    subject,
    html: buildHtml(update, adminUrl, isUpdate),
  });

  if (error) {
    console.error("Resend daily update notify error:", error);
  }
}
