"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  listCandidatePreviousSearchesAction,
  loadCandidateJobsForRoleAction,
  loadPreviousSearchJobsAction,
  refreshCandidateJobsAction,
  toggleCandidateJobAppliedAction,
  toggleCandidateJobSelectedAction,
  type JobSearchSourceMode,
} from "@/server/actions/candidate-jobs";
import {
  formatJobSourceLabel,
  jobListingMatchesSource,
  resolveJobSource,
} from "@/server/services/apify-job-search";
import type {
  CandidateJobListing,
  PreviousSearchRole,
} from "@/server/services/candidate-jobs";
import {
  cacheExpiresAt,
  normalizeSearchRole,
  type RoleScrapeCacheStatus,
} from "@/server/services/job-role-cache";
import styles from "./candidate-jobs-sheet.module.css";

type CandidateJobsSheetProps = {
  candidateId: string;
  candidateName: string;
  searchTerms: string[];
  searchQuery: string;
  defaultInterestedRole: string;
  hasResume: boolean;
  initialJobs: CandidateJobListing[];
  initialPreviousSearches: PreviousSearchRole[];
};

type SourceFilter = JobSearchSourceMode;

function sourceBadgeClass(source: string, jobUrl: string): string {
  const resolved = resolveJobSource(source, jobUrl);
  if (resolved === "linkedin") {
    return styles.sourceLinkedin ?? "";
  }
  if (resolved === "indeed") {
    return styles.sourceIndeed ?? "";
  }
  return styles.sourceDefault ?? "";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCacheExpiry(status: RoleScrapeCacheStatus): string {
  if (!status.fresh || !status.lastScrapedAt) {
    return "Needs Apify scrape";
  }

  return `Cached until ${formatDate(cacheExpiresAt(status.lastScrapedAt))}`;
}

export function CandidateJobsSheet({
  candidateId,
  candidateName,
  searchTerms,
  searchQuery: initialSearchQuery,
  defaultInterestedRole,
  hasResume,
  initialJobs,
  initialPreviousSearches,
}: CandidateJobsSheetProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<
    "error" | "success" | "warning" | "info"
  >("error");
  const [pending, startTransition] = useTransition();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [pendingSource, setPendingSource] = useState<JobSearchSourceMode | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStored, setLoadingStored] = useState(false);
  const [interestedRole, setInterestedRole] = useState(defaultInterestedRole);
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialSearchQuery);
  const [cacheStatus, setCacheStatus] = useState<RoleScrapeCacheStatus[]>([]);
  const [previousSearches, setPreviousSearches] = useState(initialPreviousSearches);
  const [selectedPreviousSearch, setSelectedPreviousSearch] = useState("");
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const skipRoleReloadRef = useRef(false);
  const lastSearchRoleRef = useRef<string | null>(null);

  useEffect(() => {
    const role = interestedRole.trim();
    if (!role || isSearching) {
      return;
    }

    if (skipRoleReloadRef.current) {
      skipRoleReloadRef.current = false;
      return;
    }

    const normalizedRole = normalizeSearchRole(role);
    if (lastSearchRoleRef.current === normalizedRole) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingStored(true);
      try {
        const result = await loadCandidateJobsForRoleAction(candidateId, role);
        if ("success" in result && result.success) {
          setJobs(result.jobs);
          setCacheStatus(result.cacheStatus);
        }
      } finally {
        setLoadingStored(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [candidateId, interestedRole, isSearching]);

  async function refreshPreviousSearchesList() {
    const result = await listCandidatePreviousSearchesAction(candidateId);
    if ("success" in result && result.success) {
      setPreviousSearches(result.searches);
    }
  }

  async function handlePreviousSearchChange(storedSearchRole: string) {
    setSelectedPreviousSearch(storedSearchRole);

    if (!storedSearchRole) {
      return;
    }

    setLoadingPrevious(true);
    setMessage(null);

    try {
      const result = await loadPreviousSearchJobsAction(
        candidateId,
        storedSearchRole,
      );

      if ("error" in result && result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      if ("success" in result && result.success) {
        skipRoleReloadRef.current = true;
        lastSearchRoleRef.current = result.searchRole;
        setInterestedRole(result.label);
        setJobs(result.jobs);
        setCacheStatus(result.cacheStatus);
        setActiveSearchQuery(`${result.label} · United States`);
        setMessageKind("info");
        setMessage(
          `Loaded ${result.jobs.length} stored job${result.jobs.length === 1 ? "" : "s"} from previous search "${result.label}".`,
        );
      }
    } finally {
      setLoadingPrevious(false);
    }
  }

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) =>
        jobListingMatchesSource(job.source, sourceFilter, job.jobUrl),
      ),
    [jobs, sourceFilter],
  );

  const sourceCounts = useMemo(() => {
    const counts = { indeed: 0, linkedin: 0 };
    for (const job of jobs) {
      const resolved = resolveJobSource(job.source, job.jobUrl);
      if (resolved === "linkedin") {
        counts.linkedin += 1;
      } else if (resolved === "indeed") {
        counts.indeed += 1;
      }
    }
    return counts;
  }, [jobs]);

  async function handleSearch(sourceMode: JobSearchSourceMode) {
    const role = interestedRole.trim();
    if (!role) {
      setMessageKind("error");
      setMessage("Enter an interested role before searching.");
      return;
    }

    setMessage(null);
    setPendingSource(sourceMode);
    setIsSearching(true);

    try {
      const result = await refreshCandidateJobsAction(candidateId, sourceMode, role);

      if ("error" in result && result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      if ("success" in result && result.success) {
        skipRoleReloadRef.current = true;
        lastSearchRoleRef.current = normalizeSearchRole(role);
        setJobs(result.jobs);
        setActiveSearchQuery(result.searchQuery);
        setCacheStatus(result.cacheStatus);
        setSelectedPreviousSearch(result.searchRole);
        void refreshPreviousSearchesList();

        if (result.info && !result.apifyCalled) {
          setMessageKind("info");
          setMessage(`${result.info} Showing ${result.count} stored job${result.count === 1 ? "" : "s"}.`);
        } else if (result.warning) {
          setMessageKind("warning");
          setMessage(
            result.info
              ? `${result.info} ${result.warning}`
              : result.warning,
          );
        } else if (result.info) {
          setMessageKind("success");
          setMessage(
            `${result.info} ${result.newJobsAdded} new unique job${result.newJobsAdded === 1 ? "" : "s"} added (${result.count} total for this role).`,
          );
        } else {
          setMessageKind("success");
          setMessage(
            `${result.count} job${result.count === 1 ? "" : "s"} stored for "${role}".`,
          );
        }
      }
    } catch {
      setMessageKind("error");
      setMessage("Job search failed. Please try again.");
    } finally {
      setIsSearching(false);
      setPendingSource(null);
    }
  }

  function handleToggleSelected(jobId: string, selected: boolean) {
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

  function handleToggleApplied(jobId: string, applied: boolean) {
    startTransition(async () => {
      const result = await toggleCandidateJobAppliedAction(
        candidateId,
        jobId,
        applied,
      );
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setJobs((current) =>
        current.map((job) =>
          job.id === jobId
            ? {
                ...job,
                applied,
                appliedAt: applied ? new Date().toISOString() : null,
              }
            : job,
        ),
      );
    });
  }

  const fileName = `${candidateName.replace(/\s+/g, "_")}_jobs.xlsx`;
  const searchBusy = isSearching || loadingPrevious;
  const indeedCache = cacheStatus.find((entry) => entry.source === "indeed");
  const linkedinCache = cacheStatus.find((entry) => entry.source === "linkedin");

  return (
    <div className={styles.sheet}>
      <div className={styles.searchRoleBar}>
        <label htmlFor="interestedRole" className={styles.roleLabel}>
          Interested role
        </label>
        <input
          id="interestedRole"
          type="text"
          value={interestedRole}
          onChange={(event) => {
            setInterestedRole(event.target.value);
            setSelectedPreviousSearch("");
          }}
          placeholder="e.g. Software Engineer, Data Analyst"
          className={styles.roleInput}
          disabled={searchBusy}
        />
        <span className={styles.roleHint}>
          Jobs are stored per role for 24 hours. Use <strong>Previous searches</strong> to
          reload an earlier role without calling Apify again.
        </span>
        <label htmlFor="previousSearch" className={styles.previousSearchLabel}>
          Previous searches
        </label>
        <select
          id="previousSearch"
          value={selectedPreviousSearch}
          onChange={(event) => handlePreviousSearchChange(event.target.value)}
          className={styles.previousSearchSelect}
          disabled={searchBusy}
        >
          <option value="">
            {previousSearches.length > 0
              ? "Load a previous search…"
              : "No previous searches yet"}
          </option>
          {previousSearches.map((entry) => (
            <option key={entry.searchRole} value={entry.searchRole}>
              {entry.label} ({entry.jobCount} job{entry.jobCount === 1 ? "" : "s"} ·{" "}
              {formatDate(entry.lastScrapedAt)})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.toolbarLabel}>Apify job search</span>
          <span className={styles.toolbarFile}>{fileName}</span>
        </div>
        <div className={styles.toolbarActions}>
          {searchBusy && (
            <span className={styles.toolbarSpinner} aria-hidden />
          )}
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => handleSearch("indeed")}
            disabled={searchBusy}
          >
            {pendingSource === "indeed" ? "Searching Indeed…" : "Search Indeed"}
          </button>
          <button
            type="button"
            className={`${styles.refreshBtn} ${styles.refreshBtnLinkedin}`}
            onClick={() => handleSearch("linkedin")}
            disabled={searchBusy}
          >
            {pendingSource === "linkedin" ? "Searching LinkedIn…" : "Search LinkedIn"}
          </button>
          <button
            type="button"
            className={`${styles.refreshBtn} ${styles.refreshBtnAll}`}
            onClick={() => handleSearch("all")}
            disabled={searchBusy}
          >
            {pendingSource === "all" ? "Searching all…" : "Search all"}
          </button>
        </div>
      </div>

      <div className={styles.metaBar}>
        <p>
          <strong>Stored role:</strong> {interestedRole.trim() || "—"}
          {loadingStored || loadingPrevious ? " · Loading stored jobs…" : ""}
        </p>
        <p>
          <strong>Indeed cache:</strong>{" "}
          {indeedCache ? formatCacheExpiry(indeedCache) : "Not scraped yet for this role"}
        </p>
        <p>
          <strong>LinkedIn cache:</strong>{" "}
          {linkedinCache ? formatCacheExpiry(linkedinCache) : "Not scraped yet for this role"}
        </p>
        <p>
          <strong>Search query:</strong> {activeSearchQuery}
        </p>
        <p>
          <strong>Interest keywords:</strong>{" "}
          {searchTerms.length > 0 ? searchTerms.join(", ") : "General entry-level roles"}
        </p>
        <p>
          <strong>Resume on file:</strong>{" "}
          {hasResume ? "Yes" : "No — upload improves match scores"}
        </p>
        <p>
          <strong>Sources in sheet:</strong> Indeed {sourceCounts.indeed} · LinkedIn{" "}
          {sourceCounts.linkedin}
        </p>
        <p>
          <strong>Last search:</strong>{" "}
          {jobs[0]?.scrapedAt ? formatDate(jobs[0].scrapedAt) : "Not searched yet"}
        </p>
      </div>

      <div className={styles.filterBar}>
        <label htmlFor="sourceFilter" className={styles.filterLabel}>
          Filter by source
        </label>
        <select
          id="sourceFilter"
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
          className={styles.filterSelect}
          disabled={searchBusy}
        >
          <option value="all">All sources ({jobs.length})</option>
          <option value="indeed">Indeed ({sourceCounts.indeed})</option>
          <option value="linkedin">LinkedIn ({sourceCounts.linkedin})</option>
        </select>
      </div>

      {message && (
        <p
          className={`${styles.message} ${
            messageKind === "success"
              ? styles.messageSuccess
              : messageKind === "warning"
                ? styles.messageWarning
                : messageKind === "info"
                  ? styles.messageInfo
                  : ""
          }`}
          role="alert"
        >
          {message}
        </p>
      )}

      <div className={styles.contentArea}>
        {searchBusy && (
          <div className={styles.loadingOverlay} role="status" aria-live="polite">
            <span className={styles.loadingSpinner} aria-hidden />
            <p className={styles.loadingTitle}>
              Searching {pendingSource === "all" ? "Indeed & LinkedIn" : pendingSource}…
            </p>
            <p className={styles.loadingText}>
              Looking for &ldquo;{interestedRole.trim()}&rdquo; — usually takes 1–2 minutes.
            </p>
          </div>
        )}

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <p>
            No jobs yet. Enter an interested role above, then search Indeed and/or LinkedIn.
          </p>
          <div className={styles.emptyActions}>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => handleSearch("all")}
              disabled={searchBusy}
            >
              {searchBusy ? "Searching…" : "Search all sources"}
            </button>
          </div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className={styles.empty}>
          <p>No jobs match the selected source filter.</p>
        </div>
      ) : (
        <div className={styles.tableViewport}>
          <table className={styles.excelTable}>
            <thead>
              <tr>
                <th className={styles.rowNumHead}>#</th>
                <th>Shortlist</th>
                <th>Applied</th>
                <th>Source</th>
                <th>Match %</th>
                <th>Resume fit</th>
                <th>Job title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Job URL</th>
                <th>Description</th>
                <th>Scraped at</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, index) => (
                <tr
                  key={job.id}
                  className={
                    job.applied
                      ? styles.rowApplied
                      : job.selected
                        ? styles.rowSelected
                        : undefined
                  }
                >
                  <td className={styles.rowNum}>{index + 1}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={job.selected}
                      onChange={(event) =>
                        handleToggleSelected(job.id, event.target.checked)
                      }
                      aria-label={`Shortlist ${job.role} at ${job.company}`}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={job.applied}
                      onChange={(event) =>
                        handleToggleApplied(job.id, event.target.checked)
                      }
                      aria-label={`Mark applied ${job.role} at ${job.company}`}
                    />
                  </td>
                  <td>
                    <span className={`${styles.sourceBadge} ${sourceBadgeClass(job.source, job.jobUrl)}`}>
                      {formatJobSourceLabel(job.source, job.jobUrl)}
                    </span>
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

      </div>

      <p className={styles.footerNote}>
        Each <strong>interested role</strong> (e.g. Data Scientist vs Full Stack) keeps its
        own job list in the database. Apify runs at most once per source every 24 hours per
        role; after that, new daily jobs are merged in. Use the{" "}
        <strong>Source</strong> column and filter to review each market separately. Check{" "}
        <strong>Applied</strong> when you submit — the candidate sees it in Applications.
      </p>
    </div>
  );
}
