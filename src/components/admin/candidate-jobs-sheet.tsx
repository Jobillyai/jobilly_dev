"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
} from "@/server/services/job-market-search";
import type {
  CandidateJobListing,
  PreviousSearchRole,
} from "@/server/services/candidate-jobs";
import {
  cacheExpiresAt,
  normalizeSearchRole,
  type RoleScrapeCacheStatus,
} from "@/server/services/job-role-cache";
import { formatExperienceYears, parseExperienceYears } from "@/lib/format-experience-years";
import { useScrapedJobsLiveUpdates } from "@/lib/hooks/use-scraped-jobs-live-updates";
import styles from "./candidate-jobs-sheet.module.css";

type CandidateJobsSheetProps = {
  candidateId: string;
  candidateName: string;
  candidateExperienceYears?: number | null;
  searchTerms: string[];
  searchQuery: string;
  defaultInterestedRole: string;
  hasResume: boolean;
  initialJobs: CandidateJobListing[];
  initialPreviousSearches: PreviousSearchRole[];
  canScrape: boolean;
};

type SourceFilter = JobSearchSourceMode;

function sourceBadgeClass(source: string, jobUrl: string): string {
  const resolved = resolveJobSource(source, jobUrl);
  if (resolved === "google_jobs") {
    return styles.sourceGoogle ?? "";
  }
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
    return "Needs scrape";
  }

  return `Cached until ${formatDate(cacheExpiresAt(status.lastScrapedAt))}`;
}

export function CandidateJobsSheet({
  candidateId,
  candidateName,
  candidateExperienceYears = null,
  searchTerms,
  searchQuery: initialSearchQuery,
  defaultInterestedRole,
  hasResume,
  initialJobs,
  initialPreviousSearches,
  canScrape,
}: CandidateJobsSheetProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<
    "error" | "success" | "warning" | "info"
  >("error");
  const [pending, startTransition] = useTransition();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [pendingSource, setPendingSource] = useState<JobSearchSourceMode | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStored, setLoadingStored] = useState(false);
  const [interestedRole, setInterestedRole] = useState(defaultInterestedRole);
  const [experienceYearsInput, setExperienceYearsInput] = useState(
    candidateExperienceYears?.toString() ?? "",
  );
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialSearchQuery);
  const [cacheStatus, setCacheStatus] = useState<RoleScrapeCacheStatus[]>([]);
  const [previousSearches, setPreviousSearches] = useState(initialPreviousSearches);
  const [selectedPreviousSearch, setSelectedPreviousSearch] = useState("");
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [isBackgroundScraping, setIsBackgroundScraping] = useState(false);
  const skipRoleReloadRef = useRef(false);
  const lastSearchRoleRef = useRef<string | null>(null);

  const refreshJobsForRole = useCallback(async () => {
    const role = interestedRole.trim();
    if (!role) {
      return;
    }

    const result = await loadCandidateJobsForRoleAction(candidateId, role);
    if ("success" in result && result.success) {
      setJobs(result.jobs);
      setCacheStatus(result.cacheStatus);
    }
  }, [candidateId, interestedRole]);

  useScrapedJobsLiveUpdates({
    candidateId,
    searchRole: interestedRole.trim() || null,
    enabled: Boolean(candidateId && interestedRole.trim()),
    scrapeActive: isBackgroundScraping,
    onRefresh: refreshJobsForRole,
  });

  useEffect(() => {
    setExperienceYearsInput(
      candidateExperienceYears === null || candidateExperienceYears === undefined
        ? ""
        : String(candidateExperienceYears),
    );
  }, [candidateExperienceYears]);

  useEffect(() => {
    const role = interestedRole.trim();
    if (!role || isBackgroundScraping) {
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
  }, [candidateId, interestedRole, isBackgroundScraping]);

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
    const counts = { indeed: 0, linkedin: 0, google_jobs: 0 };
    for (const job of jobs) {
      const resolved = resolveJobSource(job.source, job.jobUrl);
      if (resolved === "linkedin") {
        counts.linkedin += 1;
      } else if (resolved === "indeed") {
        counts.indeed += 1;
      } else if (resolved === "google_jobs") {
        counts.google_jobs += 1;
      }
    }
    return counts;
  }, [jobs]);

  function searchSourceLabel(sourceMode: JobSearchSourceMode): string {
    if (sourceMode === "all") {
      return "Indeed, LinkedIn & Google Jobs";
    }
    if (sourceMode === "google_jobs") {
      return "Google Jobs";
    }
    return sourceMode.charAt(0).toUpperCase() + sourceMode.slice(1);
  }

  function resolvedExperienceYears(): number | null {
    if (experienceYearsInput.trim() === "") {
      return null;
    }
    return parseExperienceYears(experienceYearsInput);
  }

  async function handleSearch(sourceMode: JobSearchSourceMode) {
    const role = interestedRole.trim();
    if (!role) {
      setMessageKind("error");
      setMessage("Enter an interested role before searching.");
      return;
    }

    setMessage(null);
    setPendingSource(sourceMode);
    skipRoleReloadRef.current = true;
    lastSearchRoleRef.current = normalizeSearchRole(role);

    const storedResult = await loadCandidateJobsForRoleAction(candidateId, role);
    if ("success" in storedResult && storedResult.success) {
      setJobs(storedResult.jobs);
      setCacheStatus(storedResult.cacheStatus);
      setActiveSearchQuery(`${role} · United States`);
    }

    if (canScrape) {
      setIsBackgroundScraping(true);
      setMessageKind("info");
      setMessage(
        storedResult && "success" in storedResult && storedResult.success
          ? `Showing ${storedResult.jobs.length} stored job${storedResult.jobs.length === 1 ? "" : "s"}. Scraping ${searchSourceLabel(sourceMode)} in the background — new rows appear automatically.`
          : `Scraping ${searchSourceLabel(sourceMode)} in the background — jobs will appear in the sheet as they are found.`,
      );
    } else {
      setIsSearching(true);
    }

    try {
      const result = await refreshCandidateJobsAction(
        candidateId,
        sourceMode,
        role,
        canScrape ? resolvedExperienceYears() : undefined,
      );

      if ("error" in result && result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setJobs(result.jobs);
        setActiveSearchQuery(result.searchQuery);
        setCacheStatus(result.cacheStatus);
        setSelectedPreviousSearch(result.searchRole);
        void refreshPreviousSearchesList();

        if (result.info && !result.scrapeCalled) {
          setMessageKind("info");
          setMessage(`${result.info} Showing ${result.count} stored job${result.count === 1 ? "" : "s"}.`);
        } else if (result.warning) {
          setMessageKind("warning");
          setMessage(
            result.info
              ? `${result.info} ${result.warning}`
              : result.warning,
          );
        } else if (result.scrapeCalled) {
          setMessageKind("success");
          setMessage(
            `Scrape finished — ${result.newJobsAdded} new unique job${result.newJobsAdded === 1 ? "" : "s"} added (${result.count} total for this role).`,
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
      setIsBackgroundScraping(false);
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
    const job = jobs.find((entry) => entry.id === jobId);

    startTransition(async () => {
      const result = await toggleCandidateJobAppliedAction(
        candidateId,
        jobId,
        applied,
      );
      if (result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }
      setJobs((current) =>
        current.map((entry) =>
          entry.id === jobId
            ? {
                ...entry,
                applied,
                appliedAt: applied ? new Date().toISOString() : null,
              }
            : entry,
        ),
      );
      if (applied && job) {
        setMessageKind("success");
        setMessage(
          `Marked as applied — the candidate will see only "${job.role}" at ${job.company} with its job description and preparation tips.`,
        );
      }
    });
  }

  const fileName = `${candidateName.replace(/\s+/g, "_")}_jobs.xlsx`;
  const loadingPreviousSearch = loadingPrevious;
  const scrapeInProgress = isBackgroundScraping;
  const showMentorLoading = isSearching && !canScrape;
  const indeedCache = cacheStatus.find((entry) => entry.source === "indeed");
  const linkedinCache = cacheStatus.find((entry) => entry.source === "linkedin");
  const googleCache = cacheStatus.find((entry) => entry.source === "google_jobs");

  return (
    <div className={styles.sheet}>
      <div
        className={`${styles.searchRoleBar} ${canScrape ? styles.searchRoleBarManager : ""}`}
      >
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
          disabled={loadingPreviousSearch || scrapeInProgress}
        />
        {canScrape ? (
          <>
            <label htmlFor="experienceYears" className={styles.experienceLabel}>
              Years exp.
            </label>
            <input
              id="experienceYears"
              type="number"
              min={0}
              max={50}
              value={experienceYearsInput}
              onChange={(event) => setExperienceYearsInput(event.target.value)}
              placeholder=""
              className={styles.experienceInput}
              disabled={loadingPreviousSearch || scrapeInProgress}
              aria-label="Years of experience for job scraping"
            />
          </>
        ) : null}
        <span className={styles.roleHint}>
          Jobs are stored per role and refreshed by the manager every 3 hours.
          {canScrape
            ? " Set role and years of experience, then search — both are saved when you scrape."
            : " Use Previous searches to reload an earlier role — scraping is manager-only."}
        </span>
        {canScrape ? (
          <p className={styles.onFileSummary}>
            On file: {defaultInterestedRole || "No role"} ·{" "}
            {formatExperienceYears(candidateExperienceYears) || "No exp."}
          </p>
        ) : null}
        <label htmlFor="previousSearch" className={styles.previousSearchLabel}>
          Previous searches
        </label>
        <select
          id="previousSearch"
          value={selectedPreviousSearch}
          onChange={(event) => handlePreviousSearchChange(event.target.value)}
          className={styles.previousSearchSelect}
          disabled={loadingPreviousSearch || scrapeInProgress}
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
          <span className={styles.toolbarLabel}>
            {canScrape ? "Job search" : "Stored jobs"}
          </span>
          <span className={styles.toolbarFile}>{fileName}</span>
        </div>
        <div className={styles.toolbarActions}>
          {(scrapeInProgress || showMentorLoading) && (
            <span className={styles.toolbarSpinner} aria-hidden />
          )}
          {canScrape ? (
            <>
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={() => handleSearch("indeed")}
                disabled={loadingPreviousSearch || scrapeInProgress}
              >
                {pendingSource === "indeed" ? "Searching Indeed…" : "Search Indeed"}
              </button>
              <button
                type="button"
                className={`${styles.refreshBtn} ${styles.refreshBtnLinkedin}`}
                onClick={() => handleSearch("linkedin")}
                disabled={loadingPreviousSearch || scrapeInProgress}
              >
                {pendingSource === "linkedin" ? "Searching LinkedIn…" : "Search LinkedIn"}
              </button>
              <button
                type="button"
                className={`${styles.refreshBtn} ${styles.refreshBtnGoogle}`}
                onClick={() => handleSearch("google_jobs")}
                disabled={loadingPreviousSearch || scrapeInProgress}
              >
                {pendingSource === "google_jobs" ? "Searching Google…" : "Search Google Jobs"}
              </button>
              <button
                type="button"
                className={`${styles.refreshBtn} ${styles.refreshBtnAll}`}
                onClick={() => handleSearch("all")}
                disabled={loadingPreviousSearch || scrapeInProgress}
              >
                {pendingSource === "all" ? "Searching all…" : "Search all"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => handleSearch("all")}
              disabled={loadingPreviousSearch || scrapeInProgress}
            >
              {showMentorLoading ? "Loading…" : "Refresh stored jobs"}
            </button>
          )}
        </div>
      </div>

      <div className={styles.metaBar}>
        <p>
          <strong>Stored role:</strong> {interestedRole.trim() || "—"}
          {loadingStored || loadingPrevious ? " · Loading stored jobs…" : ""}
        </p>
        <p>
          <strong>Indeed cache:</strong>{" "}
          {indeedCache ? formatCacheExpiry(indeedCache) : "Not searched yet for this role"}
        </p>
        <p>
          <strong>LinkedIn cache:</strong>{" "}
          {linkedinCache ? formatCacheExpiry(linkedinCache) : "Not searched yet for this role"}
        </p>
        <p>
          <strong>Google Jobs cache:</strong>{" "}
          {googleCache ? formatCacheExpiry(googleCache) : "Not searched yet for this role"}
        </p>
        <p>
          <strong>Experience:</strong>{" "}
          {formatExperienceYears(resolvedExperienceYears()) ||
            formatExperienceYears(candidateExperienceYears) ||
            "Not set — enter years before scraping"}
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
          {sourceCounts.linkedin} · Google Jobs {sourceCounts.google_jobs}
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
          disabled={loadingPreviousSearch || scrapeInProgress}
        >
          <option value="all">All sources ({jobs.length})</option>
          <option value="indeed">Indeed ({sourceCounts.indeed})</option>
          <option value="linkedin">LinkedIn ({sourceCounts.linkedin})</option>
          <option value="google_jobs">Google Jobs ({sourceCounts.google_jobs})</option>
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
        {scrapeInProgress && (
          <div className={styles.scrapeBanner} role="status" aria-live="polite">
            <span className={styles.toolbarSpinner} aria-hidden />
            <p className={styles.scrapeBannerText}>
              <strong>
                Scraping {pendingSource ? searchSourceLabel(pendingSource) : "jobs"}…
              </strong>{" "}
              Stored jobs are shown below. New rows are added automatically as each
              source finishes (Indeed → LinkedIn → Google Jobs) via live updates.
            </p>
          </div>
        )}

        {showMentorLoading && (
          <div className={styles.loadingOverlay} role="status" aria-live="polite">
            <span className={styles.loadingSpinner} aria-hidden />
            <p className={styles.loadingTitle}>Loading stored jobs…</p>
          </div>
        )}

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {scrapeInProgress
              ? `Scraping "${interestedRole.trim()}" — jobs will appear here as they are found.`
              : canScrape
                ? "No jobs yet. Enter an interested role above, then search Indeed, LinkedIn, or Google Jobs."
                : "No jobs yet for this role. The manager refreshes listings every 3 hours — check back after the next run."}
          </p>
          <div className={styles.emptyActions}>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => handleSearch("all")}
              disabled={loadingPreviousSearch || scrapeInProgress}
            >
              {scrapeInProgress
                ? "Scraping…"
                : showMentorLoading
                  ? "Loading…"
                  : canScrape
                    ? "Search all sources"
                    : "Refresh stored jobs"}
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
                <th>Source</th>
                <th>Match %</th>
                <th>Resume fit</th>
                <th>Job title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Job URL</th>
                <th>Description</th>
                <th>Scraped at</th>
                <th className={styles.appliedHead}>Applied</th>
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
                      disabled={job.applied}
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
                  <td className={styles.appliedCell}>
                    <label className={styles.appliedControl}>
                      <input
                        type="checkbox"
                        checked={job.applied}
                        onChange={(event) =>
                          handleToggleApplied(job.id, event.target.checked)
                        }
                        aria-label={`Mark applied ${job.role} at ${job.company}`}
                      />
                      <span className={job.applied ? styles.appliedLabelOn : styles.appliedLabelOff}>
                        {job.applied ? "Applied" : "Mark applied"}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      <p className={styles.footerNote}>
        Each <strong>interested role</strong> keeps its own job list. The manager scrapes
        Indeed, LinkedIn, and Google Jobs every 3 hours; mentors review stored jobs and mark
        applications. Check <strong>Applied</strong> at the end of a row when you submit —
        the candidate receives only that job&apos;s description and preparation tips in
        Applications.
      </p>
    </div>
  );
}
