import type { DailyActivityItem } from "@/server/services/admin-daily-updates";
import { groupDailyActivityItems } from "@/lib/group-daily-activity";
import styles from "./admin-daily-tasks.module.css";

type AdminDailyActivityListProps = {
  items: DailyActivityItem[];
  emptyMessage?: string;
};

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function AdminDailyActivityList({
  items,
  emptyMessage = "No tracked activity yet today. Jobs scraped, applications submitted, and advisory invites appear here automatically.",
}: AdminDailyActivityListProps) {
  const groups = groupDailyActivityItems(items);

  if (groups.length === 0) {
    return <p className={styles.emptyInline}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.activityList}>
      {groups.map((group) => (
        <li key={group.id} className={styles.activityItem}>
          <div className={styles.activityMain}>
            <span className={styles.activityBadge}>{group.badge}</span>
            <p className={styles.activityLabel}>{group.label}</p>
          </div>
          {group.at ? (
            <time className={styles.activityTime} dateTime={group.at}>
              {formatTime(group.at)}
            </time>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
