"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listCandidatePreviousSearchesAction,
  loadCandidateAppliedJobsAction,
  loadCandidateJobsForRoleAction,
  loadPreviousSearchJobsAction,
  prepareCandidateJobSearchAction,
  sendCandidateApplicationsDigestAction,
  toggleCandidateJobAppliedAction,
  toggleCandidateJobSelectedAction,
  uploadAppliedJobResumeAction,
  uploadAndAnalyzeCandidateResumeAction,
  type JobSearchSourceMode,
} from "@/server/actions/candidate-jobs";
import {
  jobListingMatchesSource,
  jobMatchesKeywordFilter,
  countJobsBySource,
  JOB_MARKET_SOURCES,
  JOB_MARKET_SOURCE_LABELS,
  type JobListingSourceFilter,
  type JobMarketSource,
} from "@/server/services/job-market-search";
import type {
  CandidateJobListing,
  JobListingViewMode,
  PreviousSearchRole,
} from "@/server/services/candidate-jobs";
import {
  cacheExpiresAt,
  countJobsMatchingFreshnessFilter,
  jobMatchesFreshnessFilter,
  normalizeSearchRole,
  type JobFreshnessFilter,
  type RoleScrapeCacheStatus,
} from "@/server/services/job-role-cache";
import {
  experienceLevelFromYears,
  yearsFromExperienceLevel,
  type ExperienceLevel,
} from "@/lib/format-experience-years";
import { useScrapedJobsLiveUpdates } from "@/lib/hooks/use-scraped-jobs-live-updates";
import {
  buildCandidateResumeCorpus,
  calculateResumeJobMatchPercent,
  resumeMatchLevel,
  type CandidateResumeMatchInput,
} from "@/lib/resume-job-match";
import { AdminJobList } from "@/components/admin/admin-job-list";
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
  candidateResumeMatch?: CandidateResumeMatchInput;
  candidateResumeDownloadUrl?: string | null;
  candidateResumeFileName?: string | null;
  initialAnalyzedResumeText?: string | null;
};

type SourceFilter = JobListingSourceFilter;

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
    return "Search needed";
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
  candidateResumeMatch,
  candidateResumeDownloadUrl = null,
  candidateResumeFileName = null,
  initialAnalyzedResumeText = null,
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
  const [searchSourceMode, setSearchSourceMode] = useState<JobSearchSourceMode>("all");
  const [pendingSource, setPendingSource] = useState<JobSearchSourceMode | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStored, setLoadingStored] = useState(false);
  const [interestedRole, setInterestedRole] = useState(defaultInterestedRole);
  const [experienceLevelInput, setExperienceLevelInput] = useState<ExperienceLevel | "">(
    () => experienceLevelFromYears(candidateExperienceYears) ?? "",
  );
  const [keywordsInput, setKeywordsInput] = useState("");
  const [cacheStatus, setCacheStatus] = useState<RoleScrapeCacheStatus[]>([]);
  const [previousSearches, setPreviousSearches] = useState(initialPreviousSearches);
  const [selectedPreviousSearch, setSelectedPreviousSearch] = useState("");
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [isBackgroundScraping, setIsBackgroundScraping] = useState(false);
  const [uploadingResumeJobId, setUploadingResumeJobId] = useState<string | null>(null);
  const [analyzedResumeText, setAnalyzedResumeText] = useState<string | null>(
    initialAnalyzedResumeText,
  );
  const [resumeDownloadUrl, setResumeDownloadUrl] = useState<string | null>(
    candidateResumeDownloadUrl,
  );
  const [resumeFileName, setResumeFileName] = useState<string | null>(
    candidateResumeFileName,
  );
  const [resumeAnalysisMeta, setResumeAnalysisMeta] = useState<{
    wordCount: number;
    atsScore: number | null;
    atsGrade: string | null;
  } | null>(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [sendingDigestEmail, setSendingDigestEmail] = useState(false);
  const resumeAnalyzeInputRef = useRef<HTMLInputElement>(null);
  const skipRoleReloadRef = useRef(false);
  const lastSearchRoleRef = useRef<string | null>(null);

  const refreshJobsForRole = useCallback(async () => {
    if (isAppliedView) {
      const result = await loadCandidateAppliedJobsAction(candidateId);
      if ("success" in result && result.success) {
        setJobs(result.jobs);
      }
      return;
    }

    const role = interestedRole.trim();
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
    setJobs(initialJobs);
    setPreviousSearches(initialPreviousSearches);
    setInterestedRole(defaultInterestedRole);
    setAnalyzedResumeText(initialAnalyzedResumeText);
    setResumeDownloadUrl(candidateResumeDownloadUrl);
    setResumeFileName(candidateResumeFileName);
    setResumeAnalysisMeta(
      initialAnalyzedResumeText?.trim()
        ? {
            wordCount: initialAnalyzedResumeText.trim().split(/\s+/).filter(Boolean).length,
            atsScore: null,
            atsGrade: null,
          }
        : null,
    );
    setMessage(null);
    setCacheStatus([]);
    setSelectedPreviousSearch("");
    setSourceFilter("all");
    setFreshnessFilter("all");
    setKeywordsInput("");
    skipRoleReloadRef.current = false;
    lastSearchRoleRef.current = null;
  }, [
    candidateId,
    initialJobs,
    initialPreviousSearches,
    defaultInterestedRole,
    initialAnalyzedResumeText,
    candidateResumeDownloadUrl,
    candidateResumeFileName,
  ]);

  useEffect(() => {
    setExperienceLevelInput(experienceLevelFromYears(candidateExperienceYears) ?? "");
  }, [candidateExperienceYears, candidateId]);

  useEffect(() => {
    if (isAppliedView) {
      return;
    }

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

  const resumeCorpus = useMemo(
    () =>
      buildCandidateResumeCorpus({
        ...candidateResumeMatch,
        resumeText: analyzedResumeText,
        interestedRole:
          interestedRole.trim() || candidateResumeMatch?.interestedRole || null,
      }),
    [candidateResumeMatch, interestedRole, analyzedResumeText],
  );

  const usingAnalyzedResume = Boolean(analyzedResumeText?.trim());

  const jobsWithMatch = useMemo(
    () =>
      jobs.map((job) => {
        const score = calculateResumeJobMatchPercent(resumeCorpus, {
          role: job.role,
          company: job.company,
          jdText: job.jdText,
        });

        return {
          ...job,
          relevanceScore: score,
          resumeMatch: resumeMatchLevel(score),
        };
      }),
    [jobs, resumeCorpus],
  );

  const filteredJobs = useMemo(
    () =>
      jobsWithMatch
        .filter(
          (job) =>
            jobListingMatchesSource(job.source, sourceFilter, job.jobUrl, job.location) &&
            (isAppliedView || jobMatchesFreshnessFilter(job.postedAt, freshnessFilter)) &&
            jobMatchesKeywordFilter(job, keywordsInput),
        )
        .sort((a, b) => {
          if (isAppliedView) {
            const aTime = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
            const bTime = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
            return bTime - aTime;
          }

          return b.relevanceScore - a.relevanceScore;
        }),
    [jobsWithMatch, sourceFilter, freshnessFilter, keywordsInput, isAppliedView],
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
      return "all sources";
    }
    return JOB_MARKET_SOURCE_LABELS[sourceMode];
  }

  function resolvedExperienceYears(): number | null {
    if (!experienceLevelInput) {
      return null;
    }
    return yearsFromExperienceLevel(experienceLevelInput);
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

    let backgroundScrapeStarted = false;

    try {
      const prep = await prepareCandidateJobSearchAction(
        candidateId,
        sourceMode,
        role,
        canScrape ? resolvedExperienceYears() : undefined,
        keywordsInput.trim() || undefined,
      );

      if ("error" in prep && prep.error) {
        setMessageKind("error");
        setMessage(prep.error);
        setPendingSource(null);
        return;
      }

      if (!("success" in prep) || !prep.success) {
        setPendingSource(null);
        return;
      }

      setJobs((current) => mergeJobListings(current, prep.jobs));
      setCacheStatus(prep.cacheStatus);
      setSelectedPreviousSearch(prep.searchRole);
      void refreshPreviousSearchesList();

      if (prep.shouldScrape && canScrape) {
        backgroundScrapeStarted = true;
        setIsBackgroundScraping(true);
        setMessageKind("info");
        setMessage(
          prep.jobs.length > 0
            ? `Showing ${prep.jobs.length} stored job${prep.jobs.length === 1 ? "" : "s"}. Searching ${searchSourceLabel(sourceMode)} in the background (LinkedIn → Indeed → Glassdoor → ZipRecruiter) — new rows append automatically.`
            : `Searching ${searchSourceLabel(sourceMode)} in the background (LinkedIn → Indeed → Glassdoor → ZipRecruiter) — jobs appear as each source finishes.`,
        );

        void fetch("/api/admin/candidate-jobs/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId,
            sourceMode,
            interestedRole: role,
            searchKeywords: keywordsInput.trim() || null,
          }),
        })
          .then(async (response) => {
            const result = (await response.json()) as {
              error?: string;
              success?: boolean;
              scrapeCalled?: boolean;
              newJobsAdded?: number;
              count?: number;
              cacheStatus?: typeof cacheStatus;
              warning?: string;
              info?: string;
            };

            if (!response.ok || result.error) {
              setMessageKind("error");
              setMessage(result.error ?? "Background job search failed.");
              return;
            }

            if (result.cacheStatus) {
              setCacheStatus(result.cacheStatus);
            }
            await refreshJobsForRole();

            if (result.warning) {
              setMessageKind("warning");
              setMessage(
                result.info
                  ? `${result.info} ${result.warning}`
                  : result.warning,
              );
            } else if (result.scrapeCalled) {
              setMessageKind("success");
              setMessage(
                `Search finished — ${result.newJobsAdded ?? 0} new unique job${result.newJobsAdded === 1 ? "" : "s"} added (${result.count ?? prep.jobs.length} total for this role).`,
              );
            } else if (result.info) {
              setMessageKind("info");
              setMessage(result.info);
            }
          })
          .catch(() => {
            setMessageKind("error");
            setMessage("Background job search failed. Check your connection and try again.");
          })
          .finally(() => {
            setIsBackgroundScraping(false);
            setPendingSource(null);
          });

        return;
      }

      if (prep.info) {
        setMessageKind("info");
        setMessage(`${prep.info} Showing ${prep.jobs.length} stored job${prep.jobs.length === 1 ? "" : "s"}.`);
      } else {
        setMessageKind("success");
        setMessage(
          `${prep.jobs.length} job${prep.jobs.length === 1 ? "" : "s"} stored for "${role}".`,
        );
      }
    } catch {
      setMessageKind("error");
      setMessage("Job search failed. Please try again.");
    } finally {
      if (!backgroundScrapeStarted) {
        if (!canScrape) {
          setIsSearching(false);
        }
        setPendingSource(null);
      }
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

  function applyResumeAnalysisResult(result: {
    resumeText?: string;
    downloadUrl?: string;
    fileName?: string;
    wordCount?: number;
    atsScore?: number | null;
    atsGrade?: string | null;
  }) {
    if (result.resumeText) {
      setAnalyzedResumeText(result.resumeText);
    }
    if (result.downloadUrl) {
      setResumeDownloadUrl(result.downloadUrl);
    }
    if (result.fileName) {
      setResumeFileName(result.fileName);
    }
    if (result.wordCount !== undefined) {
      setResumeAnalysisMeta({
        wordCount: result.wordCount,
        atsScore: result.atsScore ?? null,
        atsGrade: result.atsGrade ?? null,
      });
    }
  }

  async function handleSendApplicationsDigest() {
    setSendingDigestEmail(true);
    setMessage(null);

    try {
      const result = await sendCandidateApplicationsDigestAction(candidateId);
      if ("error" in result) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      setMessageKind("success");
      setMessage(
        `Application summary emailed to ${result.recipientEmail} (${result.jobCount} job${result.jobCount === 1 ? "" : "s"}).`,
      );
    } finally {
      setSendingDigestEmail(false);
    }
  }

  async function handleAnalyzeResumeUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    setAnalyzingResume(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("interestedRole", interestedRole.trim());

    try {
      const result = await uploadAndAnalyzeCandidateResumeAction(candidateId, formData);
      if (result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      if (result.success) {
        applyResumeAnalysisResult(result);
        setMessageKind("success");
        const atsNote =
          result.atsScore != null
            ? ` Overall ATS score: ${result.atsScore}${result.atsGrade ? ` (${result.atsGrade})` : ""}.`
            : "";
        setMessage(
          `Resume analyzed (${result.wordCount?.toLocaleString() ?? 0} words). Match % updated for all jobs.${atsNote}`,
        );
      }
    } finally {
      setAnalyzingResume(false);
    }
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


  const loadingPreviousSearch = loadingPrevious;
  const scrapeInProgress = isBackgroundScraping;
  const showMentorLoading = isSearching && !canScrape;
  const sourceCacheByName = useMemo(
    () =>
      Object.fromEntries(
        JOB_MARKET_SOURCES.map((source) => [
          source,
          cacheStatus.find((entry) => entry.source === source),
        ]),
      ) as Record<JobMarketSource, (typeof cacheStatus)[number] | undefined>,
    [cacheStatus],
  );

  const controlsHint = isAppliedView
    ? "Attach the resume used, or undo apply to return a job to the pipeline."
    : canScrape
      ? null
      : "Load a previous search below, or wait for an admin to search again.";

  return (
    <div className={styles.sheet}>
      <section className={styles.controls}>
        <div className={styles.controlsTop}>
          <div className={styles.controlsIntro}>
            <h2 className={styles.controlsTitle}>
              {isAppliedView ? "Applied jobs" : canScrape ? "Apply for jobs" : "Stored jobs"}
            </h2>
            {controlsHint ? <p className={styles.controlsHint}>{controlsHint}</p> : null}
            {resumeAnalysisMeta ? (
              <p className={styles.analysisMeta}>
                {usingAnalyzedResume ? "Resume analyzed" : "Profile match only"}
                {" · "}
                {resumeAnalysisMeta.wordCount.toLocaleString()} words
                {resumeAnalysisMeta.atsScore != null
                  ? ` · ATS ${resumeAnalysisMeta.atsScore}${
                      resumeAnalysisMeta.atsGrade ? ` (${resumeAnalysisMeta.atsGrade})` : ""
                    }`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className={styles.controlsActions}>
            {resumeDownloadUrl ? (
              <a
                href={resumeDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.resumeViewLink}
                title={resumeFileName ?? undefined}
              >
                {candidateName}&apos;s resume
              </a>
            ) : (
              <span className={styles.resumeMissingLabel}>No resume on file for {candidateName}</span>
            )}
            <label className={styles.resumeAnalyzeBtn}>
              <input
                ref={resumeAnalyzeInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className={styles.resumeFileInput}
                disabled={analyzingResume || loadingPreviousSearch || scrapeInProgress}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void handleAnalyzeResumeUpload(file);
                  event.target.value = "";
                }}
              />
              {analyzingResume ? "Analyzing…" : "Upload & analyze resume"}
            </label>
            {(scrapeInProgress || showMentorLoading) && (
              <span className={styles.toolbarSpinner} aria-hidden />
            )}
            {isAppliedView && canScrape ? (
              <button
                type="button"
                className={styles.sendMailBtn}
                onClick={() => void handleSendApplicationsDigest()}
                disabled={sendingDigestEmail || loadingStored || appliedCount === 0}
              >
                {sendingDigestEmail ? "Sending…" : "Send mail"}
              </button>
            ) : null}
            {(!canScrape || isAppliedView) && (
              <button
                type="button"
                className={styles.searchBtn}
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

        {!isAppliedView ? (
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="interestedRole" className={styles.fieldLabel}>
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
                className={styles.fieldInput}
                disabled={loadingPreviousSearch || scrapeInProgress}
              />
            </div>
            <div className={styles.fieldExperience}>
              <label htmlFor="experienceLevel" className={styles.fieldLabel}>
                Experience
              </label>
              <select
                id="experienceLevel"
                value={experienceLevelInput}
                onChange={(event) =>
                  setExperienceLevelInput(event.target.value as ExperienceLevel | "")
                }
                className={styles.fieldInput}
                disabled={!canScrape || loadingPreviousSearch || scrapeInProgress}
                aria-label="Experience level for job search"
              >
                <option value="">Not set</option>
                <option value="entry">Entry level</option>
                <option value="mid">Mid level</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div className={styles.fieldWide}>
              <label htmlFor="searchKeywords" className={styles.fieldLabel}>
                Keywords
              </label>
              <input
                id="searchKeywords"
                type="text"
                value={keywordsInput}
                onChange={(event) => setKeywordsInput(event.target.value)}
                placeholder="React, remote, Python — optional"
                className={styles.fieldInput}
                disabled={loadingPreviousSearch || scrapeInProgress}
              />
            </div>
            <div className={styles.fieldHistory}>
              <label htmlFor="previousSearch" className={styles.fieldLabel}>
                Previous searches
              </label>
              <select
                id="previousSearch"
                value={selectedPreviousSearch}
                onChange={(event) => handlePreviousSearchChange(event.target.value)}
                className={styles.fieldSelect}
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
          </div>
        ) : null}

        {!isAppliedView && canScrape ? (
          <div className={styles.searchBar}>
            <div className={styles.searchBarField}>
              <label htmlFor="searchSource" className={styles.fieldLabel}>
                Job board
              </label>
              <select
                id="searchSource"
                value={searchSourceMode}
                onChange={(event) =>
                  setSearchSourceMode(event.target.value as JobSearchSourceMode)
                }
                className={styles.fieldSelect}
                disabled={loadingPreviousSearch || scrapeInProgress}
              >
                <option value="all">All sources</option>
                {JOB_MARKET_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {JOB_MARKET_SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={styles.searchBtn}
              onClick={() => void handleSearch(searchSourceMode)}
              disabled={loadingPreviousSearch || scrapeInProgress}
            >
              {pendingSource
                ? `Searching ${searchSourceLabel(pendingSource)}…`
                : searchSourceMode === "all"
                  ? "Search all sources"
                  : `Search ${JOB_MARKET_SOURCE_LABELS[searchSourceMode]}`}
            </button>
          </div>
        ) : null}

        <div className={styles.metaFilters}>
          <div className={styles.statPills}>
            {isAppliedView ? (
              <span className={styles.statPill}>
                <strong>{appliedCount}</strong> role{appliedCount === 1 ? "" : "s"} submitted
              </span>
            ) : (
              <>
                {JOB_MARKET_SOURCES.map((source) => (
                  <span key={source} className={styles.statPill}>
                    {JOB_MARKET_SOURCE_LABELS[source]} cache:{" "}
                    {sourceCacheByName[source]
                      ? formatCacheExpiry(sourceCacheByName[source]!)
                      : "not searched"}
                  </span>
                ))}
                <span className={styles.statPill}>
                  In sheet:{" "}
                  {JOB_MARKET_SOURCES.map((source, index) => (
                    <span key={source}>
                      {index > 0 ? " · " : ""}
                      {JOB_MARKET_SOURCE_LABELS[source]} {sourceCounts[source]}
                    </span>
                  ))}
                  {sourceCounts.other > 0 ? ` · Other ${sourceCounts.other}` : ""}
                </span>
              </>
            )}
          </div>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="sourceFilter" className={styles.fieldLabel}>
                Source
              </label>
              <select
                id="sourceFilter"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
                className={styles.fieldSelect}
                disabled={loadingPreviousSearch || scrapeInProgress}
              >
                <option value="all">All sources ({jobs.length})</option>
                {JOB_MARKET_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {JOB_MARKET_SOURCE_LABELS[source]} only ({sourceCounts[source]})
                  </option>
                ))}
                <option value="other">Other USA sources ({sourceCounts.other})</option>
              </select>
            </div>
            {!isAppliedView ? (
              <div className={styles.filterGroup}>
                <label htmlFor="freshnessFilter" className={styles.fieldLabel}>
                  Posted
                </label>
                <select
                  id="freshnessFilter"
                  value={freshnessFilter}
                  onChange={(event) =>
                    setFreshnessFilter(event.target.value as JobFreshnessFilter)
                  }
                  className={styles.fieldSelect}
                  disabled={loadingPreviousSearch || scrapeInProgress}
                >
                  <option value="all">All posting dates ({jobs.length})</option>
                  <option value="last_24h">Posted today / 24h ({freshnessCounts.last_24h})</option>
                  <option value="last_3d">Posted last 3 days ({freshnessCounts.last_3d})</option>
                  <option value="last_7d">Posted last 7 days ({freshnessCounts.last_7d})</option>
                  <option value="older">Posted 7+ days ago ({freshnessCounts.older})</option>
                </select>
              </div>
            ) : null}
            <p className={styles.filterSummary}>
              Showing {filteredJobs.length} of {jobs.length} job
              {jobs.length === 1 ? "" : "s"}
              {sourceFilter !== "all" ||
              (!isAppliedView && freshnessFilter !== "all") ||
              keywordsInput.trim()
                ? " · filtered"
                : ""}
            </p>
          </div>
          {!isAppliedView && freshnessCounts.unknown > 0 ? (
            <p className={styles.filterHint}>
              {freshnessCounts.unknown} job{freshnessCounts.unknown === 1 ? "" : "s"} missing a
              posting date — search again to populate.
            </p>
          ) : null}
        </div>
      </section>

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
                Searching {pendingSource ? searchSourceLabel(pendingSource) : "for jobs"}…
              </strong>{" "}
              Stored jobs are shown below. New rows are added automatically as each
              source finishes (LinkedIn → Indeed → Glassdoor → ZipRecruiter) via live updates.
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
                ? `Searching for "${interestedRole.trim()}" — jobs will appear here as they are found.`
                : canScrape
                  ? "No open jobs yet. Enter an interested role above, then search any source or Search all."
                  : "No open jobs yet for this role. An assigned admin can search again after the 3-hour cache expires."}
          </p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className={styles.empty}>
          <p>
            {keywordsInput.trim()
              ? `No jobs match your keywords (“${keywordsInput.trim()}”). Clear keywords or adjust source filters.`
              : sourceFilter !== "all" || (!isAppliedView && freshnessFilter !== "all")
                ? isAppliedView
                  ? "No jobs match the selected source filter."
                  : "No jobs match the selected source or posted date filters."
                : "No jobs match the current filters."}
          </p>
          {keywordsInput.trim() ? (
            <div className={styles.emptyActions}>
              <button
                type="button"
                className={styles.searchBtn}
                onClick={() => setKeywordsInput("")}
              >
                Clear keywords
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <AdminJobList
          jobs={filteredJobs}
          viewMode={isAppliedView ? "applied" : "pipeline"}
          uploadingResumeJobId={uploadingResumeJobId}
          matchUsesAnalyzedResume={usingAnalyzedResume}
          onToggleSelected={handleToggleSelected}
          onToggleApplied={handleToggleApplied}
          onResumeUpload={(jobId, file) => void handleResumeUpload(jobId, file)}
        />
      )}

      </div>

    </div>
  );
}
