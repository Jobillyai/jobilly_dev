"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listCandidatePreviousSearchesAction,
  loadCandidateAppliedJobsAction,
  loadCandidateJobsForRoleAction,
  loadPreviousSearchJobsAction,
  refreshCandidateJobsAction,
  toggleCandidateJobAppliedAction,
  toggleCandidateJobSelectedAction,
  uploadAppliedJobResumeAction,
  type JobSearchSourceMode,
} from "@/server/actions/candidate-jobs";
import {
  formatJobSourceLabel,
  jobListingMatchesSource,
  jobMatchesKeywordFilter,
  countJobsBySource,
  resolveJobSource,
  type JobListingSourceFilter,
} from "@/server/services/job-market-search";
import type {
  CandidateJobListing,
  JobListingViewMode,
  PreviousSearchRole,
} from "@/server/services/candidate-jobs";
import {
  cacheExpiresAt,
  countJobsMatchingFreshnessFilter,
  formatJobFreshnessLabel,
  jobMatchesFreshnessFilter,
  normalizeSearchRole,
  type JobFreshnessFilter,
  type RoleScrapeCacheStatus,
} from "@/server/services/job-role-cache";
import { isPostedWithinDays } from "@/lib/job-posted-date";
import { formatExperienceYears, parseExperienceYears } from "@/lib/format-experience-years";
import { useScrapedJobsLiveUpdates } from "@/lib/hooks/use-scraped-jobs-live-updates";
import styles from "./candidate-jobs-sheet.module.css";

type CandidateJobsSheetProps = {
  candidateId: string;
  candidateName: string;
  candidateExperienceYears?: number | null;
  defaultInterestedRole: string;
  initialJobs: CandidateJobListing[];
  initialPreviousSearches: PreviousSearchRole[];
  canScrape: boolean;
  viewMode?: JobListingViewMode;
  appliedCount?: number;
};

type SourceFilter = JobListingSourceFilter;

function sourceBadgeClass(source: string, jobUrl: string): string {
  const resolved = resolveJobSource(source, jobUrl);
  if (resolved === "linkedin") {
    return styles.sourceLinkedin ?? "";
  }
  if (resolved === "indeed") {
    return styles.sourceIndeed ?? "";
  }
  return styles.sourceOther ?? styles.sourceDefault ?? "";
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

function mergeJobListings(
  previous: CandidateJobListing[],
  latest: CandidateJobListing[],
): CandidateJobListing[] {
  const byUrl = new Map<string, CandidateJobListing>();

  for (const job of previous) {
    byUrl.set(job.jobUrl, job);
  }

  for (const job of latest) {
    byUrl.set(job.jobUrl, job);
  }

  return [...byUrl.values()].sort((a, b) => {
    const scrapedCompare = b.scrapedAt.localeCompare(a.scrapedAt);
    if (scrapedCompare !== 0) {
      return scrapedCompare;
    }
    return b.relevanceScore - a.relevanceScore;
  });
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
  defaultInterestedRole,
  initialJobs,
  initialPreviousSearches,
  canScrape,
  viewMode = "pipeline",
  appliedCount = 0,
}: CandidateJobsSheetProps) {
  const isAppliedView = viewMode === "applied";
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<
    "error" | "success" | "warning" | "info"
  >("error");
  const [, startTransition] = useTransition();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [freshnessFilter, setFreshnessFilter] = useState<JobFreshnessFilter>("all");
  const [pendingSource, setPendingSource] = useState<JobSearchSourceMode | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStored, setLoadingStored] = useState(false);
  const [interestedRole, setInterestedRole] = useState(defaultInterestedRole);
  const [experienceYearsInput, setExperienceYearsInput] = useState(
    candidateExperienceYears?.toString() ?? "",
  );
  const [keywordsInput, setKeywordsInput] = useState("");
  const [cacheStatus, setCacheStatus] = useState<RoleScrapeCacheStatus[]>([]);
  const [previousSearches, setPreviousSearches] = useState(initialPreviousSearches);
  const [selectedPreviousSearch, setSelectedPreviousSearch] = useState("");
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [isBackgroundScraping, setIsBackgroundScraping] = useState(false);
  const [uploadingResumeJobId, setUploadingResumeJobId] = useState<string | null>(null);
  const skipRoleReloadRef = useRef(false);
  const lastSearchRoleRef = useRef<string | null>(null);

  const refreshJobsForRole = useCallback(async () => {
    const role = interestedRole.trim();

    if (isAppliedView) {
      const result = await loadCandidateAppliedJobsAction(
        candidateId,
        role || undefined,
      );
      if ("success" in result && result.success) {
        setJobs(result.jobs);
      }
      return;
    }

    if (!role) {
      return;
    }

    const result = await loadCandidateJobsForRoleAction(candidateId, role, "pipeline");
    if ("success" in result && result.success) {
      setJobs((current) => mergeJobListings(current, result.jobs));
      setCacheStatus(result.cacheStatus);
    }
  }, [candidateId, interestedRole, isAppliedView]);

  useScrapedJobsLiveUpdates({
    candidateId,
    searchRole: interestedRole.trim() || null,
    enabled: Boolean(candidateId && interestedRole.trim() && !isAppliedView),
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

    if (isAppliedView) {
      if (!role) {
        return;
      }

      const timer = window.setTimeout(async () => {
        setLoadingStored(true);
        try {
          const result = await loadCandidateAppliedJobsAction(candidateId, role);
          if ("success" in result && result.success) {
            setJobs(result.jobs);
          }
        } finally {
          setLoadingStored(false);
        }
      }, 450);

      return () => window.clearTimeout(timer);
    }

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
        const result = await loadCandidateJobsForRoleAction(candidateId, role, "pipeline");
        if ("success" in result && result.success) {
          setJobs(result.jobs);
          setCacheStatus(result.cacheStatus);
        }
      } finally {
        setLoadingStored(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [candidateId, interestedRole, isBackgroundScraping, isAppliedView]);

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
        viewMode,
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
      jobs.filter(
        (job) =>
          jobListingMatchesSource(job.source, sourceFilter, job.jobUrl, job.location) &&
          jobMatchesFreshnessFilter(job.postedAt, freshnessFilter) &&
          jobMatchesKeywordFilter(job, keywordsInput),
      ),
    [jobs, sourceFilter, freshnessFilter, keywordsInput],
  );

  const sourceCounts = useMemo(() => countJobsBySource(jobs), [jobs]);

  const freshnessCounts = useMemo(
    () => ({
      last_24h: countJobsMatchingFreshnessFilter(jobs, "last_24h"),
      last_3d: countJobsMatchingFreshnessFilter(jobs, "last_3d"),
      last_7d: countJobsMatchingFreshnessFilter(jobs, "last_7d"),
      older: countJobsMatchingFreshnessFilter(jobs, "older"),
      unknown: jobs.filter((job) => !job.postedAt).length,
    }),
    [jobs],
  );

  function searchSourceLabel(sourceMode: JobSearchSourceMode): string {
    if (sourceMode === "all") {
      return "Indeed & LinkedIn";
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
      setJobs((current) => mergeJobListings(current, storedResult.jobs));
      setCacheStatus(storedResult.cacheStatus);
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
        keywordsInput.trim() || undefined,
      );

      if ("error" in result && result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setJobs((current) => mergeJobListings(current, result.jobs));
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

      if ((applied && !isAppliedView) || (!applied && isAppliedView)) {
        setJobs((current) => current.filter((entry) => entry.id !== jobId));
      } else {
        setJobs((current) =>
          current.map((entry) =>
            entry.id === jobId
              ? {
                  ...entry,
                  applied,
                  appliedAt: applied ? new Date().toISOString() : null,
                  applicationResumeFileName: applied
                    ? entry.applicationResumeFileName
                    : null,
                  applicationResumeDownloadUrl: applied
                    ? entry.applicationResumeDownloadUrl
                    : null,
                }
              : entry,
          ),
        );
      }

      router.refresh();
      if (applied && job && !isAppliedView) {
        setMessageKind("success");
        setMessage(
          `Moved "${job.role}" at ${job.company} to Applied. Open the Applied tab to attach the resume the candidate will see.`,
        );
      } else if (!applied && isAppliedView) {
        setMessageKind("success");
        setMessage("Removed from Applied — the job is back in the Job pipeline.");
      } else if (applied && job && isAppliedView) {
        setMessageKind("success");
        setMessage(
          `Marked as applied — the candidate will see "${job.role}" at ${job.company} in Applications.`,
        );
      }
    });
  }

  async function handleResumeUpload(jobId: string, file: File | undefined) {
    if (!file) {
      return;
    }

    setUploadingResumeJobId(jobId);
    setMessage(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const result = await uploadAppliedJobResumeAction(candidateId, jobId, formData);
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
                applicationResumeFileName: result.fileName ?? entry.applicationResumeFileName,
                applicationResumeDownloadUrl:
                  result.downloadUrl ?? entry.applicationResumeDownloadUrl,
              }
            : entry,
        ),
      );
      setMessageKind("success");
      setMessage("Application resume saved. The candidate can view it in Applications.");
    } finally {
      setUploadingResumeJobId(null);
    }
  }

  const fileName = isAppliedView
    ? `${candidateName.replace(/\s+/g, "_")}_applied_jobs.xlsx`
    : `${candidateName.replace(/\s+/g, "_")}_jobs.xlsx`;
  const loadingPreviousSearch = loadingPrevious;
  const scrapeInProgress = isBackgroundScraping;
  const showMentorLoading = isSearching && !canScrape;
  const indeedCache = cacheStatus.find((entry) => entry.source === "indeed");
  const linkedinCache = cacheStatus.find((entry) => entry.source === "linkedin");

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
        <label htmlFor="searchKeywords" className={styles.keywordsLabel}>
          Keywords
        </label>
        <input
          id="searchKeywords"
          type="text"
          value={keywordsInput}
          onChange={(event) => setKeywordsInput(event.target.value)}
          placeholder="e.g. React, remote, Python — optional; filters rows and refines job board search"
          className={styles.keywordsInput}
          disabled={loadingPreviousSearch || scrapeInProgress}
        />
        <span className={styles.roleHint}>
          {isAppliedView
            ? "Filter by role, attach the resume used, or undo apply to return a job to the pipeline."
            : canScrape
              ? "Each role can be searched once every 3 hours. New results append to existing jobs."
              : "Load a previous search below, or wait for an admin to run a new scrape."}
        </span>
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
            {isAppliedView ? "Applied jobs" : canScrape ? "Job search" : "Stored jobs"}
          </span>
          <span className={styles.toolbarFile}>{fileName}</span>
        </div>
        <div className={styles.toolbarActions}>
          {(scrapeInProgress || showMentorLoading) && (
            <span className={styles.toolbarSpinner} aria-hidden />
          )}
          {canScrape && !isAppliedView ? (
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
              onClick={() => (isAppliedView ? void refreshJobsForRole() : handleSearch("all"))}
              disabled={loadingPreviousSearch || scrapeInProgress}
            >
              {isAppliedView
                ? loadingStored
                  ? "Loading…"
                  : "Refresh applied jobs"
                : showMentorLoading
                  ? "Loading…"
                  : "Refresh stored jobs"}
            </button>
          )}
        </div>
      </div>

      <div className={styles.metaBar}>
        {isAppliedView ? (
          <p>
            <strong>Applied:</strong> {appliedCount} role{appliedCount === 1 ? "" : "s"} submitted
          </p>
        ) : (
          <>
            <p>
              <strong>Scrape cache:</strong> Indeed —{" "}
              {indeedCache ? formatCacheExpiry(indeedCache) : "not searched"} · LinkedIn —{" "}
              {linkedinCache ? formatCacheExpiry(linkedinCache) : "not searched"}
            </p>
            <p>
              <strong>In sheet:</strong> Indeed {sourceCounts.indeed} · LinkedIn{" "}
              {sourceCounts.linkedin}
              {sourceCounts.other > 0 ? ` · Other ${sourceCounts.other}` : ""}
            </p>
          </>
        )}
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="sourceFilter" className={styles.filterLabel}>
            Source
          </label>
          <select
            id="sourceFilter"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            className={styles.filterSelect}
            disabled={loadingPreviousSearch || scrapeInProgress}
          >
            <option value="all">All sources ({jobs.length})</option>
            <option value="indeed">Indeed only ({sourceCounts.indeed})</option>
            <option value="linkedin">LinkedIn only ({sourceCounts.linkedin})</option>
            <option value="other">Other USA sources ({sourceCounts.other})</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="freshnessFilter" className={styles.filterLabel}>
            Posted
          </label>
          <select
            id="freshnessFilter"
            value={freshnessFilter}
            onChange={(event) =>
              setFreshnessFilter(event.target.value as JobFreshnessFilter)
            }
            className={styles.filterSelect}
            disabled={loadingPreviousSearch || scrapeInProgress}
          >
            <option value="all">All posting dates ({jobs.length})</option>
            <option value="last_24h">Posted today / 24h ({freshnessCounts.last_24h})</option>
            <option value="last_3d">Posted last 3 days ({freshnessCounts.last_3d})</option>
            <option value="last_7d">Posted last 7 days ({freshnessCounts.last_7d})</option>
            <option value="older">Posted 7+ days ago ({freshnessCounts.older})</option>
          </select>
        </div>
        {freshnessCounts.unknown > 0 ? (
          <p className={styles.filterHint}>
            {freshnessCounts.unknown} job{freshnessCounts.unknown === 1 ? "" : "s"} missing a
            posting date — re-scrape to populate.
          </p>
        ) : null}
        <p className={styles.filterSummary}>
          Showing {filteredJobs.length} of {jobs.length} job
          {jobs.length === 1 ? "" : "s"}
          {sourceFilter !== "all" ||
          freshnessFilter !== "all" ||
          keywordsInput.trim()
            ? " with current filters"
            : ""}
        </p>
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
              source finishes (Indeed → LinkedIn) via live updates.
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
            {isAppliedView
              ? "No applied jobs yet. Mark roles as applied from the Job pipeline tab."
              : scrapeInProgress
                ? `Scraping "${interestedRole.trim()}" — jobs will appear here as they are found.`
                : canScrape
                  ? "No open jobs yet. Enter an interested role above, then search Indeed or LinkedIn."
                  : "No open jobs yet for this role. An assigned admin can search again after the 3-hour cache expires."}
          </p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {keywordsInput.trim()
              ? `No jobs match your keywords (“${keywordsInput.trim()}”). Clear keywords or adjust source/posted filters.`
              : sourceFilter !== "all" || freshnessFilter !== "all"
                ? "No jobs match the selected source or posted date filters."
                : "No jobs match the current filters."}
          </p>
          {keywordsInput.trim() ? (
            <div className={styles.emptyActions}>
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={() => setKeywordsInput("")}
              >
                Clear keywords
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.tableViewport}>
          <table className={styles.excelTable}>
            {isAppliedView ? (
              <>
                <thead>
                  <tr>
                    <th className={styles.rowNumHead}>#</th>
                    <th>Source</th>
                    <th>Job title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Job URL</th>
                    <th>Applied at</th>
                    <th>Posted</th>
                    <th className={styles.resumeHead}>Applied resume</th>
                    <th className={styles.appliedHead}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, index) => (
                    <tr key={job.id} className={styles.rowApplied}>
                      <td className={styles.rowNum}>{index + 1}</td>
                      <td>
                        <span
                          className={`${styles.sourceBadge} ${sourceBadgeClass(job.source, job.jobUrl)}`}
                        >
                          {formatJobSourceLabel(job.source, job.jobUrl)}
                        </span>
                      </td>
                      <td className={styles.cellStrong}>{job.role}</td>
                      <td>{job.company}</td>
                      <td>{job.location}</td>
                      <td>
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.jobLink}
                        >
                          Open
                        </a>
                      </td>
                      <td className={styles.cellDate}>
                        {job.appliedAt ? formatDate(job.appliedAt) : "—"}
                      </td>
                      <td className={styles.cellDate}>
                        {job.postedAt ? (
                          <>
                            <span>{formatDate(job.postedAt)}</span>
                            <span className={styles.freshnessBadge}>
                              {formatJobFreshnessLabel(job.postedAt)}
                            </span>
                          </>
                        ) : (
                          <span className={styles.postedUnknown}>Unknown</span>
                        )}
                      </td>
                      <td className={styles.resumeCell}>
                        <div className={styles.resumeControl}>
                          {job.applicationResumeDownloadUrl ? (
                            <a
                              href={job.applicationResumeDownloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.resumeLink}
                            >
                              {job.applicationResumeFileName ?? "View resume"}
                            </a>
                          ) : (
                            <span className={styles.resumeMissing}>No resume yet</span>
                          )}
                          <label className={styles.resumeUploadBtn}>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className={styles.resumeFileInput}
                              disabled={uploadingResumeJobId === job.id}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                void handleResumeUpload(job.id, file);
                                event.target.value = "";
                              }}
                            />
                            {uploadingResumeJobId === job.id ? "Uploading…" : "Attach resume"}
                          </label>
                        </div>
                      </td>
                      <td className={styles.appliedCell}>
                        <label className={styles.appliedControl}>
                          <input
                            type="checkbox"
                            checked
                            onChange={() => handleToggleApplied(job.id, false)}
                            aria-label={`Remove applied ${job.role} at ${job.company}`}
                          />
                          <span className={styles.appliedLabelOff}>Undo apply</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th className={styles.rowNumHead}>#</th>
                    <th>Shortlist</th>
                    <th>Source</th>
                    <th>Job title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Job URL</th>
                    <th className={styles.jdHead}>Description</th>
                    <th>Scraped at</th>
                    <th>Posted</th>
                    <th className={styles.applyHead}>Apply</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, index) => (
                    <tr
                      key={job.id}
                      className={job.selected ? styles.rowSelected : undefined}
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
                        <span
                          className={`${styles.sourceBadge} ${sourceBadgeClass(job.source, job.jobUrl)}`}
                        >
                          {formatJobSourceLabel(job.source, job.jobUrl)}
                        </span>
                      </td>
                      <td className={styles.cellStrong}>{job.role}</td>
                      <td>{job.company}</td>
                      <td>{job.location}</td>
                      <td>
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.jobLink}
                        >
                          Open
                        </a>
                      </td>
                      <td className={`${styles.cellWide} ${styles.jdCell}`}>{job.jdText ?? "—"}</td>
                      <td className={styles.cellDate}>{formatDate(job.scrapedAt)}</td>
                      <td className={styles.cellDate}>
                        {job.postedAt ? (
                          <>
                            <span>{formatDate(job.postedAt)}</span>
                            <span
                              className={`${styles.freshnessBadge} ${
                                isPostedWithinDays(job.postedAt, 3)
                                  ? styles.freshnessBadgeFresh
                                  : styles.freshnessBadgeStale
                              }`}
                            >
                              {formatJobFreshnessLabel(job.postedAt)}
                            </span>
                          </>
                        ) : (
                          <span className={styles.postedUnknown}>Unknown</span>
                        )}
                      </td>
                      <td className={styles.applyCell}>
                        <label className={styles.appliedControl}>
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={(event) =>
                              handleToggleApplied(job.id, event.target.checked)
                            }
                            aria-label={`Apply to ${job.role} at ${job.company}`}
                          />
                          <span className={styles.appliedLabelOff}>Mark applied</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}

      </div>

    </div>
  );
}
