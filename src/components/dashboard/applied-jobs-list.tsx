"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, FileText, Mic } from "lucide-react";
import { formatJobSourceLabel } from "@/server/services/job-market-search";
import {
  getApplicationResumeDownloadAction,
  markApplicationsViewedAction,
} from "@/server/actions/candidate-applications";
import type { CandidateAppliedJob } from "@/server/services/candidate-jobs";
import styles from "./applied-jobs-list.module.css";

export type AppliedJobListItem = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string | null;
  appliedAt: string;
  source: string;
  preparationTips: string[];
  isNew?: boolean;
  hasApplicationResume?: boolean;
  applicationResumeFileName: string | null;
  applicationResumeDownloadUrl: string | null;
  postedAt?: string | null;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

type AppliedJobRowProps = {
  job: AppliedJobListItem;
  expanded: boolean;
  onToggle: () => void;
};

function AppliedJobRow({ job, expanded, onToggle }: AppliedJobRowProps) {
  const detailsId = `application-details-${job.id}`;
  const [resumePending, startResumeTransition] = useTransition();
  const [resumeError, setResumeError] = useState<string | null>(null);

  function openApplicationResume() {
    setResumeError(null);
    startResumeTransition(async () => {
      const result = await getApplicationResumeDownloadAction(job.id);
      if ("error" in result) {
        setResumeError(result.error);
        return;
      }

      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    });
  }

  const showResumeAction = Boolean(
    job.hasApplicationResume || job.applicationResumeDownloadUrl,
  );

  return (
    <li
      className={[
        styles.card,
        job.isNew ? styles.cardNew : undefined,
        expanded ? styles.cardExpanded : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.summary}>
        <div className={styles.summaryText}>
          <p className={styles.role}>{job.role}</p>
          <p className={styles.summaryLine}>
            <span className={styles.company}>{job.company}</span>
            <span className={styles.summaryDot} aria-hidden>
              ·
            </span>
            <span className={styles.appliedDate}>Applied {formatDate(job.appliedAt)}</span>
          </p>
        </div>

        <div className={styles.summaryActions}>
          {job.isNew ? <span className={styles.newBadge}>New</span> : null}
          {showResumeAction ? (
            <button
              type="button"
              className={styles.resumeSummaryBtn}
              onClick={openApplicationResume}
              disabled={resumePending}
            >
              <FileText size={16} aria-hidden />
              <span>{resumePending ? "Opening…" : "Application resume"}</span>
            </button>
          ) : null}
          <button
            type="button"
            className={styles.mockInterviewBtn}
            disabled
            aria-disabled="true"
            title="Coming soon"
          >
            <Mic size={16} aria-hidden />
            <span>Start mock interview</span>
          </button>
          <button
            type="button"
            className={styles.moreBtn}
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
          >
            {expanded ? "Less" : "More"}
            <ChevronDown
              size={16}
              aria-hidden
              className={expanded ? styles.moreIconOpen : styles.moreIcon}
            />
          </button>
        </div>
      </div>

      {expanded ? (
        <div id={detailsId} className={styles.details}>
          <p className={styles.meta}>
            <span>{job.location}</span>
            <span className={styles.metaDot} aria-hidden>
              ·
            </span>
            <span>{formatJobSourceLabel(job.source, job.jobUrl)}</span>
          </p>

          {job.jobUrl ? (
            <p className={styles.meta}>
              <a href={job.jobUrl} target="_blank" rel="noreferrer" className={styles.jobLink}>
                <ExternalLink size={14} aria-hidden />
                View original listing on {formatJobSourceLabel(job.source, job.jobUrl)}
              </a>
            </p>
          ) : null}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Job description</h2>
            {job.jdText ? (
              <div className={styles.jdPanel}>
                <div className={styles.jdText}>{job.jdText}</div>
              </div>
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

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Application resume</h2>
            {showResumeAction ? (
              <div className={styles.candidateResumeBlock}>
                <button
                  type="button"
                  className={styles.resumeLink}
                  onClick={openApplicationResume}
                  disabled={resumePending}
                >
                  <FileText size={16} aria-hidden />
                  <span>
                    {resumePending
                      ? "Opening…"
                      : job.applicationResumeFileName ?? "Download application resume"}
                  </span>
                </button>
                {resumeError ? <p className={styles.resumeError}>{resumeError}</p> : null}
              </div>
            ) : (
              <p className={styles.resumePending}>
                Your application resume will appear here once our team attaches it to this
                application.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </li>
  );
}

type AppliedJobsListProps = {
  applications: AppliedJobListItem[];
};

export function AppliedJobsList({ applications }: AppliedJobsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (applications.some((job) => job.isNew)) {
      void markApplicationsViewedAction();
    }
  }, [applications]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <ul className={styles.list}>
      {applications.map((job) => (
        <AppliedJobRow
          key={job.id}
          job={job}
          expanded={expandedIds.has(job.id)}
          onToggle={() => toggleExpanded(job.id)}
        />
      ))}
    </ul>
  );
}

export function toAppliedJobListItem(job: CandidateAppliedJob): AppliedJobListItem {
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    jobUrl: job.jobUrl,
    location: job.location,
    jdText: job.jdText,
    appliedAt: job.appliedAt,
    source: job.source,
    preparationTips: job.preparationTips,
    isNew: job.isNew,
    hasApplicationResume: job.hasApplicationResume,
    applicationResumeFileName: job.applicationResumeFileName,
    applicationResumeDownloadUrl: job.applicationResumeDownloadUrl,
  };
}
