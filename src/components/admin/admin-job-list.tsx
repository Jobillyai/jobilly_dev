"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import {
  formatJobSourceLabel,
  getCleanJobListingUrl,
  resolveJobSource,
} from "@/server/services/job-market-search";
import type { CandidateJobListing, JobListingViewMode } from "@/server/services/candidate-jobs";
import { formatJobFreshnessLabel } from "@/server/services/job-role-cache";
import { isPostedWithinDays } from "@/lib/job-posted-date";
import styles from "./admin-job-list.module.css";

function formatSummaryDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDetailDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sourceBadgeClass(source: string, jobUrl: string): string {
  const resolved = resolveJobSource(source, jobUrl);
  if (resolved === "glassdoor") return styles.sourceGlassdoor;
  if (resolved === "ziprecruiter") return styles.sourceZiprecruiter;
  if (resolved === "linkedin") return styles.sourceLinkedin;
  if (resolved === "indeed") return styles.sourceIndeed;
  return styles.sourceOther;
}

function matchBadgeClass(score: number): string {
  if (score >= 70) return styles.matchHigh;
  if (score >= 45) return styles.matchMedium;
  return styles.matchLow;
}

type AdminJobListProps = {
  jobs: CandidateJobListing[];
  viewMode: JobListingViewMode;
  uploadingResumeJobId: string | null;
  matchUsesAnalyzedResume?: boolean;
  onToggleSelected: (jobId: string, selected: boolean) => void;
  onToggleApplied: (jobId: string, applied: boolean) => void;
  onResumeUpload: (jobId: string, file: File) => void;
};

type AdminJobRowProps = {
  job: CandidateJobListing;
  viewMode: JobListingViewMode;
  expanded: boolean;
  matchUsesAnalyzedResume: boolean;
  onToggle: () => void;
  uploadingResumeJobId: string | null;
  onToggleSelected: (jobId: string, selected: boolean) => void;
  onToggleApplied: (jobId: string, applied: boolean) => void;
  onResumeUpload: (jobId: string, file: File) => void;
};

function AdminJobRow({
  job,
  viewMode,
  expanded,
  matchUsesAnalyzedResume,
  onToggle,
  uploadingResumeJobId,
  onToggleSelected,
  onToggleApplied,
  onResumeUpload,
}: AdminJobRowProps) {
  const isAppliedView = viewMode === "applied";
  const detailsId = `admin-job-details-${job.id}`;
  const listingUrl = getCleanJobListingUrl(job.jobUrl, job.source);

  return (
    <li
      className={[
        styles.item,
        job.selected && !isAppliedView ? styles.itemSelected : undefined,
        isAppliedView ? styles.itemApplied : undefined,
        expanded ? styles.itemExpanded : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.summary}>
        <div className={styles.summaryText}>
          <p className={styles.role}>{job.role}</p>
          <p className={styles.summaryLine}>
            <span className={styles.company}>{job.company}</span>
            <span className={styles.dot} aria-hidden>
              ·
            </span>
            <span className={styles.metaText}>{job.location}</span>
            <span className={styles.dot} aria-hidden>
              ·
            </span>
            <span
              className={`${styles.sourceBadge} ${sourceBadgeClass(job.source, job.jobUrl)}`}
            >
              {formatJobSourceLabel(job.source, job.jobUrl)}
            </span>
          </p>
          <p className={styles.summaryDates}>
            {isAppliedView ? (
              <>
                <span className={styles.appliedDateLabel}>
                  Applied {job.appliedAt ? formatSummaryDate(job.appliedAt) : "—"}
                </span>
                <span className={styles.dot} aria-hidden>
                  ·
                </span>
                <span>Found {formatSummaryDate(job.scrapedAt)}</span>
              </>
            ) : (
              <>
                <span>Found {formatSummaryDate(job.scrapedAt)}</span>
                <span className={styles.dot} aria-hidden>
                  ·
                </span>
                {job.postedAt ? (
                  <>
                    <span>Posted {formatSummaryDate(job.postedAt)}</span>
                    <span
                      className={`${styles.freshnessBadge} ${
                        isPostedWithinDays(job.postedAt, 3)
                          ? styles.freshnessFresh
                          : styles.freshnessStale
                      }`}
                    >
                      {formatJobFreshnessLabel(job.postedAt)}
                    </span>
                  </>
                ) : (
                  <span className={styles.unknown}>Posted unknown</span>
                )}
              </>
            )}
          </p>
        </div>

        <div className={styles.summaryActions}>
          <span
            className={`${styles.matchBadge} ${matchBadgeClass(job.relevanceScore)}`}
            title={
              matchUsesAnalyzedResume
                ? "Match % from uploaded resume text vs job description keywords"
                : "Match % from profile text vs job description keywords — upload a resume to analyze"
            }
          >
            {job.relevanceScore}% match
          </span>
          {!isAppliedView && job.selected ? (
            <span className={styles.shortlistBadge}>Shortlisted</span>
          ) : null}
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
          <p className={styles.metaRow}>
            <span>{job.location}</span>
            <span className={styles.dot} aria-hidden>
              ·
            </span>
            <span>{formatJobSourceLabel(job.source, job.jobUrl)}</span>
            {isAppliedView && job.appliedAt ? (
              <>
                <span className={styles.dot} aria-hidden>
                  ·
                </span>
                <span>Applied {formatDetailDate(job.appliedAt)}</span>
              </>
            ) : null}
          </p>

          <section className={styles.linkSection}>
            <a
              href={listingUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.jobLink}
              title={listingUrl}
            >
              <ExternalLink size={14} aria-hidden />
              View job
            </a>
            {job.applyUrl ? (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.jobLink}
                title={job.applyUrl}
              >
                <ExternalLink size={14} aria-hidden />
                Apply
              </a>
            ) : null}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Job description</h3>
            {job.jdText ? (
              <div className={styles.jdPanel}>
                <div className={styles.jdText}>{job.jdText}</div>
              </div>
            ) : (
              <p className={styles.jdEmpty}>No description captured.</p>
            )}
          </section>

          {isAppliedView ? (
            <>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Applied resume</h3>
                <div className={styles.resumeControl}>
                  {job.applicationResumeDownloadUrl ? (
                    <a
                      href={job.applicationResumeDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.resumeLink}
                    >
                      <FileText size={16} aria-hidden />
                      <span>{job.applicationResumeFileName ?? "View resume"}</span>
                    </a>
                  ) : (
                    <span className={styles.resumeMissing}>No resume attached yet</span>
                  )}
                  <label className={styles.resumeUploadBtn}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className={styles.resumeFileInput}
                      disabled={uploadingResumeJobId === job.id}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onResumeUpload(job.id, file);
                        event.target.value = "";
                      }}
                    />
                    {uploadingResumeJobId === job.id ? "Uploading…" : "Attach resume"}
                  </label>
                </div>
              </section>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.undoApplyBtn}
                  onClick={() => onToggleApplied(job.id, false)}
                >
                  Undo apply
                </button>
              </div>
            </>
          ) : (
            <div className={styles.actions}>
              <label className={styles.actionCheck}>
                <input
                  type="checkbox"
                  checked={job.selected}
                  onChange={(event) => onToggleSelected(job.id, event.target.checked)}
                />
                <span>Shortlist</span>
              </label>
              <label className={styles.actionCheck}>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(event) => onToggleApplied(job.id, event.target.checked)}
                />
                <span>Mark applied</span>
              </label>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function AdminJobList({
  jobs,
  viewMode,
  uploadingResumeJobId,
  matchUsesAnalyzedResume = false,
  onToggleSelected,
  onToggleApplied,
  onResumeUpload,
}: AdminJobListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className={styles.list}>
      {jobs.map((job) => (
        <AdminJobRow
          key={job.id}
          job={job}
          viewMode={viewMode}
          expanded={expandedIds.has(job.id)}
          matchUsesAnalyzedResume={matchUsesAnalyzedResume}
          onToggle={() => toggleExpanded(job.id)}
          uploadingResumeJobId={uploadingResumeJobId}
          onToggleSelected={onToggleSelected}
          onToggleApplied={onToggleApplied}
          onResumeUpload={onResumeUpload}
        />
      ))}
    </ul>
  );
}
