import Link from "next/link";
import type { AdminCandidate } from "@/server/services/admin-dashboard";
import { formatDisplayName } from "@/lib/format-display-name";
import styles from "@/app/admin/admin.module.css";

type CandidatesListProps = {
  candidates: AdminCandidate[];
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CandidatesList({ candidates }: CandidatesListProps) {
  if (candidates.length === 0) {
    return (
      <div className={styles.emptyState}>
        No registered candidates yet.
      </div>
    );
  }

  const withSubmissions = candidates.filter((candidate) => candidate.submission);
  const withoutSubmissions = candidates.length - withSubmissions.length;

  return (
    <div className={styles.candidatesList}>
      <p className={styles.candidatesSummary}>
        {candidates.length} candidate{candidates.length === 1 ? "" : "s"} ·{" "}
        {withSubmissions.length} with advisory submission
        {withSubmissions.length === 1 ? "" : "s"}
        {withoutSubmissions > 0 ? ` · ${withoutSubmissions} without submission` : ""}
      </p>

      {candidates.map((candidate) => {
        const displayName = candidate.name
          ? formatDisplayName(candidate.name)
          : formatDisplayName(candidate.email.split("@")[0] ?? candidate.email);
        const submission = candidate.submission;

        return (
          <article key={candidate.id} className={styles.candidateCard}>
            <div className={styles.candidateHeader}>
              <div>
                <h3 className={styles.candidateName}>{displayName}</h3>
                <p className={styles.candidateMeta}>
                  {candidate.email} · {formatRole(candidate.role)}
                </p>
                <p className={styles.candidateMetaMuted}>
                  Registered {formatDate(candidate.createdAt)}
                </p>
              </div>
              <div className={styles.candidateActions}>
                <span
                  className={`${styles.badge} ${
                    submission ? styles.badgeSubmitted : styles.badgePending
                  }`}
                >
                  {submission ? "Advisory submitted" : "No submission"}
                </span>
                <Link
                  href={`/admin/candidates/${candidate.id}/jobs`}
                  className={styles.jobsBtn}
                >
                  Apply jobs
                </Link>
              </div>
            </div>

            {(candidate.profileEducation || candidate.careerGoals || candidate.linkedinUrl) && (
              <div className={styles.candidateSection}>
                <h4 className={styles.candidateSectionTitle}>Profile</h4>
                <dl className={styles.detailGrid}>
                  {candidate.profileEducation && (
                    <>
                      <dt>Profile education</dt>
                      <dd>{candidate.profileEducation}</dd>
                    </>
                  )}
                  {candidate.careerGoals && (
                    <>
                      <dt>Career goals</dt>
                      <dd>{candidate.careerGoals}</dd>
                    </>
                  )}
                  {candidate.linkedinUrl && (
                    <>
                      <dt>LinkedIn</dt>
                      <dd>
                        <a
                          href={candidate.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.detailLink}
                        >
                          {candidate.linkedinUrl}
                        </a>
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {submission ? (
              <div className={styles.candidateSection}>
                <h4 className={styles.candidateSectionTitle}>Education & advisory details</h4>
                <dl className={styles.detailGrid}>
                  <dt>Graduation details</dt>
                  <dd>{submission.graduationDetails}</dd>
                  <dt>Branch</dt>
                  <dd>{submission.branch}</dd>
                  <dt>Phone</dt>
                  <dd>{submission.phone}</dd>
                  <dt>Veteran</dt>
                  <dd>
                    <span
                      className={`${styles.badge} ${
                        submission.isVeteran ? styles.badgeYes : styles.badgeNo
                      }`}
                    >
                      {submission.isVeteran ? "Yes" : "No"}
                    </span>
                  </dd>
                  <dt>Interested technology</dt>
                  <dd className={styles.detailWide}>{submission.interestedTechnology}</dd>
                  <dt>Submitted</dt>
                  <dd>{formatDate(submission.createdAt)}</dd>
                  <dt>Invite status</dt>
                  <dd>
                    {submission.inviteSentAt
                      ? `Sent ${formatDate(submission.inviteSentAt)}`
                      : "Pending"}
                  </dd>
                  {submission.sessionScheduledAt && (
                    <>
                      <dt>Session scheduled</dt>
                      <dd>{formatDate(submission.sessionScheduledAt)}</dd>
                    </>
                  )}
                </dl>
              </div>
            ) : (
              <p className={styles.candidateNoSubmission}>
                This candidate has not submitted the career advisory form yet.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
