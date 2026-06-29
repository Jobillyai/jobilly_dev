"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadMyMatchedJobsAction } from "@/server/actions/candidate-portal-jobs";
import { formatExperienceYears } from "@/lib/format-experience-years";
import { useScrapedJobsLiveUpdates } from "@/lib/hooks/use-scraped-jobs-live-updates";
import { formatJobSourceLabel } from "@/server/services/job-market-search";
import type { CandidateJobListing } from "@/server/services/candidate-jobs";
import styles from "./candidate-matched-jobs.module.css";

type CandidateMatchedJobsProps = {
  candidateId: string;
  initialJobs: CandidateJobListing[];
  initialTargetRole: string;
  initialExperienceYears: number | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function CandidateMatchedJobs({
  candidateId,
  initialJobs,
  initialTargetRole,
  initialExperienceYears,
}: CandidateMatchedJobsProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [targetRole, setTargetRole] = useState(initialTargetRole);
  const [experienceYears, setExperienceYears] = useState(initialExperienceYears);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newJobsNotice, setNewJobsNotice] = useState<string | null>(null);
  const lastCountRef = useRef(initialJobs.length);

  const experienceLabel = formatExperienceYears(experienceYears);

  const refreshJobs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await loadMyMatchedJobsAction();
      if (!("success" in result) || !result.success) {
        return;
      }

      const { jobs: nextJobs, targetRole: nextRole, experienceYears: nextYears } =
        result.data;

      setJobs(nextJobs);
      setTargetRole(nextRole);
      setExperienceYears(nextYears);

      if (nextJobs.length > lastCountRef.current) {
        const added = nextJobs.length - lastCountRef.current;
        lastCountRef.current = nextJobs.length;
        setNewJobsNotice(
          `${added} new matched role${added === 1 ? "" : "s"} added — list updated automatically.`,
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useScrapedJobsLiveUpdates({
    candidateId,
    searchRole: targetRole || null,
    enabled: Boolean(candidateId),
    onRefresh: refreshJobs,
  });

  const shortlistedCount = useMemo(
    () => jobs.filter((job) => job.selected).length,
    [jobs],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.metaCard}>
        <p>
          <strong>Target role:</strong> {targetRole || "Not set yet by your team"}
        </p>
        {experienceYears !== null ? (
          <p>
            <strong>Experience:</strong> {experienceLabel}
          </p>
        ) : (
          <p className={styles.hint}>
            Add years of experience on your{" "}
            <Link href="/dashboard/profile" className={styles.inlineLink}>
              profile
            </Link>{" "}
            to improve job matching.
          </p>
        )}
        <p className={styles.hint}>
          This list updates live when your team adds new roles — no refresh needed.
        </p>
      </div>

      {(isRefreshing || newJobsNotice) && (
        <div className={styles.liveBanner} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden />
          <span>
            {newJobsNotice ??
              (isRefreshing ? "Checking for newly matched roles…" : "")}
          </span>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>No matched roles yet</p>
          <p className={styles.emptyText}>
            Your manager is building your job list. Roles appear here automatically as
            they are scraped — keep this page open or check back soon.
          </p>
        </div>
      ) : (
        <>
          <p className={styles.summary}>
            {jobs.length} matched role{jobs.length === 1 ? "" : "s"}
            {shortlistedCount > 0
              ? ` · ${shortlistedCount} shortlisted by your team`
              : ""}
          </p>
          <ul className={styles.list}>
            {jobs.map((job) => (
              <li key={job.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.role}>{job.role}</p>
                    <p className={styles.company}>{job.company}</p>
                  </div>
                  <div className={styles.badges}>
                    {job.selected ? (
                      <span className={styles.shortlistBadge}>Shortlisted</span>
                    ) : null}
                    {job.applied ? (
                      <span className={styles.appliedBadge}>Applied</span>
                    ) : null}
                    <span className={styles.matchBadge}>{job.relevanceScore}% match</span>
                  </div>
                </div>
                <p className={styles.meta}>
                  {job.location} · {formatJobSourceLabel(job.source, job.jobUrl)} · Added{" "}
                  {formatDate(job.scrapedAt)}
                </p>
                {job.jdText ? (
                  <p className={styles.jdPreview}>
                    {job.jdText.length > 280
                      ? `${job.jdText.slice(0, 280)}…`
                      : job.jdText}
                  </p>
                ) : null}
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.linkBtn}
                >
                  View posting
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
