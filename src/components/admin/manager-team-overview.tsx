import Link from "next/link";
import type { MentorActivityRow } from "@/server/services/admin-dashboard";
import { formatDisplayName } from "@/lib/format-display-name";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import styles from "@/app/admin/admin.module.css";

type ManagerTeamOverviewProps = {
  mentors: MentorActivityRow[];
  totalApplications: number;
};

export function ManagerTeamOverview({
  mentors,
  totalApplications,
}: ManagerTeamOverviewProps) {
  const totalAssigned = mentors.reduce(
    (sum, mentor) => sum + mentor.assignedCandidates,
    0,
  );
  const totalSubmitted = mentors.reduce(
    (sum, mentor) => sum + mentor.applicationsSubmitted,
    0,
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <div>
          <h2 className={styles.sectionTitle}>Mentor activity</h2>
          <p className={styles.sectionLead}>
            Full view of each admin mentor — assigned candidates, job pipeline, and
            applications submitted on behalf of students.
          </p>
        </div>
        <Link href="/admin/jobs" className={styles.sectionLink}>
          Job scraping
        </Link>
      </div>

      <div className={`${styles.statsGrid} ${styles.statsGridCompact}`}>
        <div className={styles.statCardInline}>
          <div className={styles.statLabel}>Active mentors</div>
          <div className={styles.statValueSm}>{mentors.length}</div>
        </div>
        <div className={styles.statCardInline}>
          <div className={styles.statLabel}>Assigned candidates</div>
          <div className={styles.statValueSm}>{totalAssigned}</div>
        </div>
        <div className={styles.statCardInline}>
          <div className={styles.statLabel}>Applications (all mentors)</div>
          <div className={styles.statValueSm}>{totalApplications}</div>
        </div>
        <div className={styles.statCardInline}>
          <div className={styles.statLabel}>Submitted this period</div>
          <div className={styles.statValueSm}>{totalSubmitted}</div>
        </div>
      </div>

      {mentors.length === 0 ? (
        <div className={styles.emptyState}>No mentor accounts yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mentor</th>
                <th>Member ID</th>
                <th>Assigned</th>
                <th>Jobs in pipeline</th>
                <th>Shortlisted</th>
                <th>Applications submitted</th>
              </tr>
            </thead>
            <tbody>
              {mentors.map((mentor) => {
                const displayName = mentor.name
                  ? formatDisplayName(mentor.name)
                  : formatDisplayName(mentor.email.split("@")[0] ?? mentor.email);

                return (
                  <tr key={mentor.mentorId}>
                    <td>
                      <strong>{displayName}</strong>
                      <div className={styles.tableSubtext}>{mentor.email}</div>
                    </td>
                    <td>
                      {mentor.memberId ? (
                        <MemberIdBadge memberId={mentor.memberId} size="sm" />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{mentor.assignedCandidates}</td>
                    <td>{mentor.scrapedJobs}</td>
                    <td>{mentor.shortlistedJobs}</td>
                    <td>
                      <span
                        className={
                          mentor.applicationsSubmitted > 0
                            ? styles.appliedCountActive
                            : undefined
                        }
                      >
                        {mentor.applicationsSubmitted}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
