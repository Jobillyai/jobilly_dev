"use client";

import { useState, useTransition } from "react";
import {
  refreshCandidateJobsAction,
  toggleCandidateJobSelectedAction,
} from "@/server/actions/candidate-jobs";
import type { CandidateJobListing } from "@/server/services/candidate-jobs";
import styles from "./candidate-jobs-sheet.module.css";

type CandidateJobsSheetProps = {
  candidateId: string;
  candidateName: string;
  searchTerms: string[];
  hasResume: boolean;
  initialJobs: CandidateJobListing[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CandidateJobsSheet({
  candidateId,
  candidateName,
  searchTerms,
  hasResume,
  initialJobs,
}: CandidateJobsSheetProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      setMessage(null);
      const result = await refreshCandidateJobsAction(candidateId);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function handleToggle(jobId: string, selected: boolean) {
    startTransition(async () => {
      const result = await toggleCandidateJobSelectedAction(
        candidateId,
        jobId,
        selected,
      );
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setJobs((current) =>
        current.map((job) => (job.id === jobId ? { ...job, selected } : job)),
      );
    });
  }

  const fileName = `${candidateName.replace(/\s+/g, "_")}_jobs.xlsx`;

  return (
    <div className={styles.sheet}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.toolbarLabel}>Job scraper</span>
          <span className={styles.toolbarFile}>{fileName}</span>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={handleRefresh}
          disabled={pending}
        >
          {pending ? "Scraping jobs…" : "Refresh job scrape"}
        </button>
      </div>

      <div className={styles.metaBar}>
        <p>
          <strong>Search terms:</strong>{" "}
          {searchTerms.length > 0 ? searchTerms.join(", ") : "General entry-level roles"}
        </p>
        <p>
          <strong>Resume on file:</strong> {hasResume ? "Yes" : "No — upload improves match scores"}
        </p>
        <p>
          <strong>Last scrape:</strong>{" "}
          {jobs[0]?.scrapedAt ? formatDate(jobs[0].scrapedAt) : "Not scraped yet"}
        </p>
      </div>

      {message && (
        <p className={styles.message} role="alert">
          {message}
        </p>
      )}

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <p>No scraped jobs yet for this candidate.</p>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={pending}
          >
            {pending ? "Scraping…" : "Scrape jobs now"}
          </button>
        </div>
      ) : (
        <div className={styles.tableViewport}>
          <table className={styles.excelTable}>
            <thead>
              <tr>
                <th className={styles.rowNumHead}>#</th>
                <th>Select</th>
                <th>Match %</th>
                <th>Resume fit</th>
                <th>Job title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Source</th>
                <th>Job URL</th>
                <th>Description</th>
                <th>Scraped at</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => (
                <tr key={job.id} className={job.selected ? styles.rowSelected : undefined}>
                  <td className={styles.rowNum}>{index + 1}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={job.selected}
                      onChange={(event) => handleToggle(job.id, event.target.checked)}
                      aria-label={`Select ${job.role} at ${job.company}`}
                    />
                  </td>
                  <td>
                    <span className={styles.scoreBadge}>{job.relevanceScore}%</span>
                  </td>
                  <td>
                    <span className={`${styles.fitBadge} ${styles[`fit${job.resumeMatch}`]}`}>
                      {job.resumeMatch}
                    </span>
                  </td>
                  <td className={styles.cellStrong}>{job.role}</td>
                  <td>{job.company}</td>
                  <td>{job.location}</td>
                  <td>{job.source}</td>
                  <td>
                    <a href={job.jobUrl} target="_blank" rel="noreferrer" className={styles.jobLink}>
                      Open
                    </a>
                  </td>
                  <td className={styles.cellWide}>{job.jdText ?? "—"}</td>
                  <td className={styles.cellDate}>{formatDate(job.scrapedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.footerNote}>
        Jobs are scraped from public listings and ranked by branch, interested technology,
        education, and resume signals. Apply actions and Excel export will be added next.
      </p>
    </div>
  );
}
