import type { AdminDailyUpdate } from "@/server/services/admin-daily-updates";
import { formatDisplayName } from "@/lib/format-display-name";
import { AdminDailyActivityList } from "@/components/admin/admin-daily-activity-list";
import styles from "./admin-daily-tasks.module.css";

type AdminDailyUpdatesPanelProps = {
  updates: AdminDailyUpdate[];
  emptyMessage?: string;
};

function formatWorkDate(workDate: string): string {
  const [year, month, day] = workDate.split("-").map(Number);
  if (!year || !month || !day) {
    return workDate;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(year, month - 1, day));
}

function formatSubmittedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function AdminDailyUpdatesPanel({
  updates,
  emptyMessage = "No mentor daily updates submitted yet for this period.",
}: AdminDailyUpdatesPanelProps) {
  if (updates.length === 0) {
    return <p className={styles.emptyInline}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.managerList}>
      {updates.map((update) => {
        const mentorName = update.employeeName
          ? formatDisplayName(update.employeeName)
          : update.employeeEmail;
        const { summary } = update.activitySnapshot;

        return (
          <article key={update.id} className={styles.managerCard}>
            <header className={styles.managerCardHeader}>
              <div>
                <h3 className={styles.managerCardTitle}>{mentorName}</h3>
                <p className={styles.managerCardMeta}>
                  {formatWorkDate(update.workDate)} · Sent {formatSubmittedAt(update.submittedAt)}
                </p>
              </div>
              <div className={styles.managerSummary}>
                <span>{summary.jobsScraped} jobs</span>
                <span>{summary.applicationsSubmitted} apps</span>
                <span>{summary.meetInvitesSent} invites</span>
              </div>
            </header>

            <AdminDailyActivityList
              items={update.activitySnapshot.items}
              emptyMessage="No tracked activity in this update."
            />

            <div className={styles.managerRemarks}>
              <p className={styles.managerRemarksLabel}>Remarks</p>
              <p className={styles.managerRemarksText}>{update.remarks}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
