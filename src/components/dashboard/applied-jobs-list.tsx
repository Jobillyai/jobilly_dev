"use client";

import { useEffect } from "react";
import { CheckCircle2, FileText, Mic, Sparkles } from "lucide-react";
import { formatJobSourceLabel } from "@/server/services/job-market-search";
import { markApplicationsViewedAction } from "@/server/actions/candidate-applications";
import type { CandidateAppliedJob } from "@/server/services/candidate-jobs";
import styles from "./applied-jobs-list.module.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

type AppliedJobsListProps = {
  applications: CandidateAppliedJob[];
};

export function AppliedJobsList({ applications }: AppliedJobsListProps) {
  useEffect(() => {
    if (applications.some((job) => job.isNew)) {
      void markApplicationsViewedAction();
    }
  }, [applications]);

  return (
    <ul className={styles.list}>
      {applications.map((job) => (
        <li key={job.id} className={styles.card}>
          <div className={styles.updateBanner}>
            <Sparkles size={16} aria-hidden />
            <span>
              Your Jobilly team applied to this role on {formatDate(job.appliedAt)}
            </span>
            {job.isNew ? <span className={styles.newBadge}>New update</span> : null}
          </div>

          <div className={styles.cardHeader}>
            <div>
              <p className={styles.role}>{job.role}</p>
              <p className={styles.company}>{job.company}</p>
            </div>
            <span className={styles.appliedBadge}>Applied</span>
          </div>

          <p className={styles.meta}>
            {job.location} · {formatJobSourceLabel(job.source, job.jobUrl)}
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Job description</h2>
            {job.jdText ? (
              <p className={styles.jdText}>{job.jdText}</p>
            ) : (
              <p className={styles.jdEmpty}>
                No description was captured for this application. Your Jobilly team will share
                more details if the employer responds.
              </p>
            )}
          </section>

          {job.preparationTips.length > 0 ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Preparation tips</h2>
              <ul className={styles.tipsList}>
                {job.preparationTips.map((tip) => (
                  <li key={tip}>
                    <CheckCircle2 size={16} aria-hidden />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {job.applicationResumeDownloadUrl ? (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Resume used</h2>
              <a
                href={job.applicationResumeDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.resumeLink}
              >
                <FileText size={16} aria-hidden />
                <span>{job.applicationResumeFileName ?? "Download resume"}</span>
              </a>
            </section>
          ) : null}

          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.mockBtn}
              disabled
              title="Voice mock interviews are coming soon"
            >
              <Mic size={16} aria-hidden />
              Start mock interview
            </button>
            <span className={styles.mockHint}>Coming soon</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
