import Link from "next/link";
import { adminApplyForJobsCandidatePath } from "@/lib/admin/apply-for-jobs-paths";
import type {
  AdminRecentCandidate,
  AdminRecentSubmission,
} from "@/server/services/admin-dashboard";
import { formatDisplayName } from "@/lib/format-display-name";
import { formatSessionDateTimeFromIso } from "@/lib/career-advisory/session-datetime";
import styles from "@/app/admin/admin.module.css";

type AdminRecentActivityProps = {
  recentCandidates: AdminRecentCandidate[];
  recentSubmissions: AdminRecentSubmission[];
  showJobApplyLinks?: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatSessionDateTime(value: string | null): string {
  if (!value) {
    return "Session time pending";
  }

  return formatSessionDateTimeFromIso(value, "staff") ?? "Session time pending";
}

export function AdminRecentActivity({
  recentCandidates,
  recentSubmissions,
  showJobApplyLinks = true,
}: AdminRecentActivityProps) {
  return (
    <div className={styles.recentGrid}>
      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Recent candidates</h2>
          <Link href="/admin/candidates" className={styles.sectionLink}>
            View all
          </Link>
        </div>
        {recentCandidates.length === 0 ? (
          <p className={styles.emptyInline}>No candidates registered yet.</p>
        ) : (
          <ul className={styles.recentList}>
            {recentCandidates.map((candidate) => {
              const displayName = candidate.name
                ? formatDisplayName(candidate.name)
                : formatDisplayName(candidate.email.split("@")[0] ?? candidate.email);

              return (
                <li key={candidate.id} className={styles.recentItem}>
                  <div>
                    <p className={styles.recentItemTitle}>{displayName}</p>
                    <p className={styles.recentItemMeta}>{candidate.email}</p>
                    <p className={styles.recentItemMeta}>
                      Joined {formatDate(candidate.createdAt)}
                      {candidate.hasSubmission ? " · Advisory submitted" : " · No submission"}
                      {candidate.scrapedJobCount > 0
                        ? ` · ${candidate.scrapedJobCount} jobs found`
                        : ""}
                    </p>
                  </div>
                  <div className={styles.recentItemActions}>
                    <Link href="/admin/candidates" className={styles.recentLink}>
                      Profile
                    </Link>
                    {showJobApplyLinks && candidate.hasManagedApplications ? (
                      <Link
                        href={adminApplyForJobsCandidatePath(candidate.id)}
                        className={styles.recentLinkPrimary}
                      >
                        Jobs
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Recent advisory submissions</h2>
          <Link href="/admin/calendar" className={styles.sectionLink}>
            View calendar
          </Link>
        </div>
        {recentSubmissions.length === 0 ? (
          <p className={styles.emptyInline}>No advisory submissions yet.</p>
        ) : (
          <ul className={styles.recentList}>
            {recentSubmissions.map((submission) => (
              <li key={submission.id} className={styles.recentItem}>
                <div>
                  <p className={styles.recentItemTitle}>
                    {formatDisplayName(submission.name)}
                  </p>
                  <p className={styles.recentItemMeta}>{submission.email}</p>
                  <p className={styles.recentItemMeta}>
                    {submission.branch} · Submitted {formatDate(submission.createdAt)}
                  </p>
                  <p className={styles.recentItemMeta}>
                    {formatSessionDateTime(submission.sessionScheduledAt)}
                  </p>
                </div>
                <div className={styles.recentItemActions}>
                  <span
                    className={`${styles.badge} ${
                      submission.inviteSent ? styles.badgeSubmitted : styles.badgePending
                    }`}
                  >
                    {submission.inviteSent ? "Invite sent" : "Invite pending"}
                  </span>
                  {submission.googleMeetLink ? (
                    <a
                      href={submission.googleMeetLink}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.meetLinkBtn}
                    >
                      Join Meet
                    </a>
                  ) : null}
                  <Link
                    href={`/admin/candidates#candidate-${submission.candidateId}`}
                    className={styles.recentLinkPrimary}
                  >
                    View booking
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
