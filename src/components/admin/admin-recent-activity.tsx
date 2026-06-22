import Link from "next/link";
import type {
  AdminRecentCandidate,
  AdminRecentSubmission,
} from "@/server/services/admin-dashboard";
import { formatDisplayName } from "@/lib/format-display-name";
import styles from "@/app/admin/admin.module.css";

type AdminRecentActivityProps = {
  recentCandidates: AdminRecentCandidate[];
  recentSubmissions: AdminRecentSubmission[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminRecentActivity({
  recentCandidates,
  recentSubmissions,
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
                        ? ` · ${candidate.scrapedJobCount} scraped jobs`
                        : ""}
                    </p>
                  </div>
                  <div className={styles.recentItemActions}>
                    <Link href="/admin/candidates" className={styles.recentLink}>
                      Profile
                    </Link>
                    <Link
                      href={`/admin/candidates/${candidate.id}/jobs`}
                      className={styles.recentLinkPrimary}
                    >
                      Jobs
                    </Link>
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
                    {submission.branch} · {formatDate(submission.createdAt)}
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
