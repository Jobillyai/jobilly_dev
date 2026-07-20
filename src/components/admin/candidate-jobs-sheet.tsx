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
  getResumeIntelligenceAction,
  removeResumeTxtOverrideAction,
  retryResumeIntelligenceAction,
  uploadCandidateBaseResumeAction,
  uploadResumeTxtOverrideAction,
  type JobSearchSourceMode,
} from "@/server/actions/candidate-jobs";
import {
  jobListingMatchesSource,
  countJobsBySource,
  JOB_MARKET_SOURCES,
  JOB_MARKET_SOURCE_LABELS,
  type JobListingSourceFilter,
} from "@/server/services/job-market-search";
import type {
  CandidateJobListing,
  JobListingViewMode,
  PreviousSearchRole,
} from "@/server/services/candidate-jobs";
import {
  countJobsMatchingFreshnessFilter,
  jobMatchesFreshnessFilter,
  normalizeSearchRole,
  type JobFreshnessFilter,
} from "@/server/services/job-role-cache";
import {
  experienceLevelFromYears,
  yearsFromExperienceLevel,
  type ExperienceLevel,
} from "@/lib/format-experience-years";
import { suggestJobSearchKeywords } from "@/lib/job-search-keywords";
import { useScrapedJobsLiveUpdates } from "@/lib/hooks/use-scraped-jobs-live-updates";
import {
  buildCandidateResumeCorpus,
  calculateResumeJobMatchPercent,
  resumeMatchLevel,
  type CandidateResumeMatchInput,
} from "@/lib/resume-job-match";
import { AdminJobList } from "@/components/admin/admin-job-list";
import styles from "./candidate-jobs-sheet.module.css";
import type { Database } from "@/server/db/database.types";
import {
  countMatchedJobKeywords,
  jobMatchesSkillFilter,
  resolveSkillMatchKeywords,
} from "@/lib/job-keyword-match";

type ResumeIntelligenceData = {
  sources: Database["public"]["Tables"]["candidate_resume_sources"]["Row"][];
  analysis: Database["public"]["Tables"]["candidate_resume_analysis"]["Row"] | null;
};

function resumeSearchTerms(analysis: ResumeIntelligenceData["analysis"]): string {
  if (!analysis) return "";
  return [...new Set(analysis.skills)].filter(Boolean).join(", ");
}

type CandidateJobsSheetProps = {
  candidateId: string;
  candidateExperienceYears?: number | null;
  defaultInterestedRole: string;
  initialJobs: CandidateJobListing[];
  initialPreviousSearches: PreviousSearchRole[];
  canScrape: boolean;
  viewMode?: JobListingViewMode;
  appliedCount?: number;
  candidateResumeMatch?: CandidateResumeMatchInput;
  initialResumeIntelligence?: ResumeIntelligenceData;
};

type SourceFilter = JobListingSourceFilter;
type JobSort = "best_match" | "newest_posted" | "recently_scraped";

function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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

const SCRAPE_SESSION_PREFIX = "jobilly-scrape:";
const SCRAPE_SESSION_MAX_AGE_MS = 15 * 60 * 1000;

function scrapeSessionKey(candidateId: string) {
  return `${SCRAPE_SESSION_PREFIX}${candidateId}`;
}

function readActiveScrapeSession(
  candidateId: string,
): { role: string; startedAt: number } | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(scrapeSessionKey(candidateId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { role: string; startedAt: number };
    if (Date.now() - parsed.startedAt > SCRAPE_SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(scrapeSessionKey(candidateId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeActiveScrapeSession(candidateId: string, role: string) {
  sessionStorage.setItem(
    scrapeSessionKey(candidateId),
    JSON.stringify({ role, startedAt: Date.now() }),
  );
}

function clearActiveScrapeSession(candidateId: string) {
  sessionStorage.removeItem(scrapeSessionKey(candidateId));
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

export function CandidateJobsSheet({
  candidateId,
  candidateExperienceYears = null,
  defaultInterestedRole,
  initialJobs,
  initialPreviousSearches,
  canScrape,
  viewMode = "pipeline",
  appliedCount = 0,
  candidateResumeMatch,
  initialResumeIntelligence = { sources: [], analysis: null },
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
  const [jobSort, setJobSort] = useState<JobSort>("best_match");
  const [searchSourceMode, setSearchSourceMode] = useState<JobSearchSourceMode>("all");
  const [pendingSource, setPendingSource] = useState<JobSearchSourceMode | null>(null);
  const [loadingStored, setLoadingStored] = useState(false);
  const [interestedRole, setInterestedRole] = useState(defaultInterestedRole);
  const [experienceLevelInput, setExperienceLevelInput] = useState<ExperienceLevel | "">(
    () => experienceLevelFromYears(candidateExperienceYears) ?? "",
  );
  const [keywordsInput, setKeywordsInput] = useState(() =>
    resumeSearchTerms(initialResumeIntelligence.analysis) ||
    suggestJobSearchKeywords(defaultInterestedRole),
  );
  const [previousSearches, setPreviousSearches] = useState(initialPreviousSearches);
  const [selectedPreviousSearch, setSelectedPreviousSearch] = useState("");
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [isBackgroundScraping, setIsBackgroundScraping] = useState(false);
  const [sendingDigestEmail, setSendingDigestEmail] = useState(false);
  const [resumeIntelligence, setResumeIntelligence] = useState(initialResumeIntelligence);
  const [intelligencePending, setIntelligencePending] = useState(false);
  const skipRoleReloadRef = useRef(false);
  const lastSearchRoleRef = useRef<string | null>(null);

  const refreshJobsForRole = useCallback(async () => {
    if (isAppliedView) {
      const result = await loadCandidateAppliedJobsAction(candidateId);
      if (result && "success" in result && result.success) {
        setJobs(result.jobs);
      }
      return;
    }

    const role = interestedRole.trim();
    if (!role) {
      return;
    }

    const result = await loadCandidateJobsForRoleAction(candidateId, role, "pipeline");
    if (result && "success" in result && result.success) {
      setJobs((current) => mergeJobListings(current, result.jobs));
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
    setInterestedRole(
      initialResumeIntelligence.analysis?.canonical_search_title ?? defaultInterestedRole,
    );
    setMessage(null);
    setSelectedPreviousSearch("");
    setSourceFilter("all");
    setFreshnessFilter("all");
    setJobSort("best_match");
    setKeywordsInput(
      resumeSearchTerms(initialResumeIntelligence.analysis) ||
      suggestJobSearchKeywords(defaultInterestedRole),
    );
    skipRoleReloadRef.current = false;
    lastSearchRoleRef.current = null;
  }, [
    candidateId,
    initialJobs,
    initialPreviousSearches,
    initialResumeIntelligence,
    defaultInterestedRole,
  ]);

  useEffect(() => {
    const activeScrape = readActiveScrapeSession(candidateId);
    if (activeScrape) {
      setIsBackgroundScraping(true);
      void refreshJobsForRole();
    }
  }, [candidateId, refreshJobsForRole]);

  useEffect(() => {
    setExperienceLevelInput(experienceLevelFromYears(candidateExperienceYears) ?? "");
  }, [candidateExperienceYears, candidateId]);

  useEffect(() => {
    if (isAppliedView) {
      return;
    }

    const role = interestedRole.trim();

    if (!role) {
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
        if (result && "success" in result && result.success) {
          setJobs(result.jobs);
        }
      } finally {
        setLoadingStored(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [candidateId, interestedRole, isAppliedView]);

  async function refreshPreviousSearchesList() {
    const result = await listCandidatePreviousSearchesAction(candidateId);
    if (result && "success" in result && result.success) {
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

      if (result && "error" in result && result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      if (result && "success" in result && result.success) {
        skipRoleReloadRef.current = true;
        lastSearchRoleRef.current = result.searchRole;
        setInterestedRole(result.label);
        setKeywordsInput(suggestJobSearchKeywords(result.label));
        setJobs(result.jobs);
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
        resumeText: null,
        interestedRole:
          interestedRole.trim() || candidateResumeMatch?.interestedRole || null,
      }),
    [candidateResumeMatch, interestedRole],
  );
  const activeSkills = useMemo(
    () =>
      resolveSkillMatchKeywords(
        keywordsInput,
        resumeIntelligence.analysis?.skills ?? [],
      ),
    [keywordsInput, resumeIntelligence.analysis?.skills],
  );

  const jobsWithMatch = useMemo(
    () =>
      jobs.map((job) => {
        const score = calculateResumeJobMatchPercent(resumeCorpus, {
          role: job.role,
          company: job.company,
          jdText: job.jdText,
        });
        const keywordMatchCount = countMatchedJobKeywords(activeSkills, {
          jdText: job.jdText,
        });
        const keywordScore = Math.max(
          keywordMatchCount > 0 && activeSkills.length > 0
            ? Math.min(
                100,
                Math.round((keywordMatchCount / activeSkills.length) * 100),
              )
            : 0,
          Math.min(100, keywordMatchCount * 10),
        );
        const combinedScore =
          activeSkills.length > 0
            ? Math.round(keywordScore * 0.9 + score * 0.1)
            : score;

        return {
          ...job,
          relevanceScore: combinedScore,
          resumeMatch: resumeMatchLevel(combinedScore),
          keywordMatchCount,
        };
      }),
    [activeSkills, jobs, resumeCorpus],
  );

  const filteredJobs = useMemo(
    () =>
      jobsWithMatch
        .filter(
          (job) =>
            jobListingMatchesSource(job.source, sourceFilter, job.jobUrl, job.location) &&
            (isAppliedView || jobMatchesFreshnessFilter(job.postedAt, freshnessFilter)) &&
            jobMatchesSkillFilter(job, activeSkills),
        )
        .sort((a, b) => {
          if (isAppliedView) {
            return timestamp(b.appliedAt) - timestamp(a.appliedAt);
          }

          if (jobSort === "newest_posted") {
            const postedCompare = timestamp(b.postedAt) - timestamp(a.postedAt);
            return postedCompare || timestamp(b.scrapedAt) - timestamp(a.scrapedAt);
          }

          if (jobSort === "recently_scraped") {
            return timestamp(b.scrapedAt) - timestamp(a.scrapedAt);
          }

          return (
            b.keywordMatchCount - a.keywordMatchCount ||
            b.relevanceScore - a.relevanceScore ||
            timestamp(b.postedAt) - timestamp(a.postedAt)
          );
        }),
    [jobsWithMatch, sourceFilter, freshnessFilter, activeSkills, isAppliedView, jobSort],
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
    if (
      resumeIntelligence.analysis?.status !== "completed" ||
      !resumeIntelligence.analysis.category_id ||
      !resumeIntelligence.analysis.canonical_search_title
    ) {
      setMessageKind("error");
      setMessage("Complete resume analysis before searching.");
      return;
    }
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
      setSelectedPreviousSearch(prep.searchRole);
      void refreshPreviousSearchesList();

      if (prep.shouldScrape && canScrape) {
        backgroundScrapeStarted = true;
        setIsBackgroundScraping(true);
        writeActiveScrapeSession(candidateId, role);
        setMessageKind("info");
        setMessage(
          prep.jobs.length > 0
            ? `Showing ${prep.jobs.length} stored job${prep.jobs.length === 1 ? "" : "s"}. Searching ${searchSourceLabel(sourceMode)}, including Fortune 500 employers, in parallel.`
            : `Searching ${searchSourceLabel(sourceMode)}, including Fortune 500 employers, in parallel — jobs save automatically.`,
        );

        const scrapeModes: JobSearchSourceMode[] =
          sourceMode === "all"
            ? prep.sourcesToScrape.length > 0
              ? prep.sourcesToScrape
              : ["linkedin", "indeed"]
            : [sourceMode];

        const runScrapeRequest = async (mode: JobSearchSourceMode) => {
          const response = await fetch("/api/admin/candidate-jobs/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidateId,
              sourceMode: mode,
              interestedRole: role,
              searchKeywords: keywordsInput.trim() || null,
            }),
          });

          return {
            mode,
            response,
            result: (await response.json()) as {
              error?: string;
              success?: boolean;
              scrapeCalled?: boolean;
              newJobsAdded?: number;
              count?: number;
              warning?: string;
              info?: string;
            },
          };
        };

        setPendingSource(null);

        void Promise.all(scrapeModes.map((mode) => runScrapeRequest(mode)))
          .then(async (outcomes) => {
            const failed = outcomes.find(
              ({ response, result }) => !response.ok || result.error,
            );
            if (failed) {
              setMessageKind("error");
              setMessage(failed.result.error ?? "Background job search failed.");
              return;
            }

            await refreshJobsForRole();

            const warnings = [
              ...new Set(
                outcomes
                  .map(({ result }) => result.warning)
                  .filter(Boolean) as string[],
              ),
            ];
            const infos = outcomes
              .map(({ result }) => result.info)
              .filter(Boolean) as string[];
            const scraped = outcomes.some(({ result }) => result.scrapeCalled);
            const newJobsAdded = outcomes.reduce(
              (sum, { result }) => sum + (result.newJobsAdded ?? 0),
              0,
            );
            const totalCount =
              outcomes[outcomes.length - 1]?.result.count ?? prep.jobs.length;

            if (warnings.length > 0) {
              setMessageKind("warning");
              setMessage(
                infos.length > 0
                  ? `${infos.join(" ")} ${warnings.join(" ")}`
                  : warnings.join(" "),
              );
            } else if (scraped) {
              setMessageKind("success");
              setMessage(
                `Search finished — ${newJobsAdded} new unique job${newJobsAdded === 1 ? "" : "s"} added (${totalCount} total), including Fortune 500 targeting.`,
              );
            } else if (infos.length > 0) {
              setMessageKind("info");
              setMessage(infos.join(" "));
            }
          })
          .catch(() => {
            setMessageKind("error");
            setMessage("Background job search failed. Check your connection and try again.");
          })
          .finally(() => {
            clearActiveScrapeSession(candidateId);
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
        setPendingSource(null);
      }
    }
  }

  async function reloadResumeIntelligence() {
    const result = await getResumeIntelligenceAction(candidateId);
    if (result && "success" in result) {
      setResumeIntelligence(result.intelligence);
      const analysis = result.intelligence.analysis;
      if (analysis?.status === "completed" && analysis.canonical_search_title) {
        setInterestedRole(analysis.canonical_search_title ?? "");
        setKeywordsInput(resumeSearchTerms(analysis));
      }
    }
  }

  function markIntelligenceProcessing() {
    setResumeIntelligence((current) => ({
      ...current,
      analysis: current.analysis
        ? { ...current.analysis, status: "processing", error_message: null }
        : current.analysis,
    }));
  }

  async function handleTxtOverride(file: File | undefined) {
    if (!file) return;
    setIntelligencePending(true);
    markIntelligenceProcessing();
    setMessage(null);
    const data = new FormData();
    data.set("resumeTxt", file);
    const result = await uploadResumeTxtOverrideAction(candidateId, data);
    if (result && "error" in result && result.error) {
      setMessageKind("error");
      setMessage(result.error);
    } else {
      await reloadResumeIntelligence();
      setMessageKind("success");
      setMessage("TXT override analyzed. Role, skills, and keywords were filled automatically.");
    }
    setIntelligencePending(false);
  }

  async function handleBaseResume(file: File | undefined) {
    if (!file) return;
    setIntelligencePending(true);
    markIntelligenceProcessing();
    setMessage(null);
    const data = new FormData();
    data.set("baseResume", file);
    const result = await uploadCandidateBaseResumeAction(candidateId, data);
    await reloadResumeIntelligence();
    if (result && "error" in result && result.error) {
      setMessageKind("error");
      setMessage(result.error);
    } else if (result && "warning" in result && result.warning) {
      setMessageKind("warning");
      setMessage(result.warning);
    } else {
      setMessageKind("success");
      setMessage("Base resume analyzed. Role, skills, and keywords were filled automatically.");
    }
    setIntelligencePending(false);
  }

  async function handleRemoveOverride() {
    setIntelligencePending(true);
    const result = await removeResumeTxtOverrideAction(candidateId);
    if (result && "error" in result && result.error) {
      setMessageKind("error");
      setMessage(result.error);
    } else {
      await reloadResumeIntelligence();
      setMessageKind("success");
      setMessage("TXT override removed; the base resume is active again.");
    }
    setIntelligencePending(false);
  }

  async function handleRetryIntelligence() {
    setIntelligencePending(true);
    markIntelligenceProcessing();
    const result = await retryResumeIntelligenceAction(candidateId);
    if (result && "error" in result && result.error) {
      setMessageKind("error");
      setMessage(result.error);
    } else {
      await reloadResumeIntelligence();
    }
    setIntelligencePending(false);
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
          `Moved "${job.role}" at ${job.company} to Applied.`,
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

  async function handleUploadApplicationResume(jobId: string, file: File) {
    const formData = new FormData();
    formData.set("resume", file);
    const result = await uploadAppliedJobResumeAction(candidateId, jobId, formData);

    if (result.error) {
      return { error: result.error };
    }

    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? {
              ...job,
              applicationResumeFileName: result.fileName ?? file.name,
              applicationResumeDownloadUrl: result.downloadUrl ?? null,
            }
          : job,
      ),
    );

    return {
      success: true as const,
      fileName: result.fileName ?? file.name,
      downloadUrl: result.downloadUrl ?? null,
    };
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


  const loadingPreviousSearch = loadingPrevious;
  const scrapeInProgress = isBackgroundScraping;
  const searchRequestInFlight = pendingSource !== null;
  const isAnalyzingResume =
    intelligencePending || resumeIntelligence.analysis?.status === "processing";

  const controlsHint = isAppliedView
    ? "Undo apply to return a job to the pipeline."
    : canScrape
      ? null
      : "Load a previous search below, or wait for an admin to search again.";

  return (
    <div className={styles.sheet}>
      {!isAppliedView ? (
        <section className={styles.intelligenceCard}>
          <div className={styles.intelligenceHeader}>
            <div>
              <span className={styles.intelligenceEyebrow}>Strict search gate</span>
              <h2>Resume intelligence</h2>
              <p>
                {resumeIntelligence.analysis?.effective_source_kind === "admin_txt_override"
                  ? "Admin TXT override is the active analysis source."
                  : "The candidate’s PDF/DOCX resume is the active analysis source."}
              </p>
            </div>
            <span
              className={
                isAnalyzingResume
                  ? styles.intelligenceAnalyzing
                  : resumeIntelligence.analysis?.status === "completed"
                    ? styles.intelligenceReady
                    : styles.intelligenceNeedsReview
              }
            >
              {isAnalyzingResume
                ? "Analyzing…"
                : resumeIntelligence.analysis?.status === "completed"
                  ? "Ready to search"
                  : resumeIntelligence.analysis?.status ?? "No analysis"}
            </span>
          </div>
          {isAnalyzingResume ? (
            <div className={styles.intelligenceLoading} role="status" aria-live="polite">
              <span className={styles.toolbarSpinner} aria-hidden />
              <p className={styles.intelligenceLoadingText}>
                <strong>Analyzing resume with Gemini…</strong> Extracting role, skills, and
                search keywords. This usually takes 15–45 seconds.
              </p>
            </div>
          ) : !resumeIntelligence.analysis ? (
            <p className={styles.intelligenceError}>
              Upload a current PDF or DOCX from the candidate profile, then retry analysis.
            </p>
          ) : resumeIntelligence.analysis.error_message ? (
            <p className={styles.intelligenceError}>{resumeIntelligence.analysis.error_message}</p>
          ) : resumeIntelligence.analysis.status === "completed" ? (
            <p className={styles.intelligenceNotice}>
              Analysis fills the role and keywords below automatically.
            </p>
          ) : null}
          <div className={styles.intelligenceActions}>
            <label className={styles.fileAction}>
              {resumeIntelligence.sources.some((source) => source.source_kind === "base_resume")
                ? "Replace base resume"
                : "Upload base resume"}
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={intelligencePending}
                onChange={(event) => void handleBaseResume(event.target.files?.[0])}
              />
            </label>
            <label className={styles.fileAction}>
              {resumeIntelligence.sources.some((source) => source.source_kind === "admin_txt_override")
                ? "Replace TXT override"
                : "Upload TXT override"}
              <input
                type="file"
                accept=".txt,text/plain"
                disabled={intelligencePending}
                onChange={(event) => void handleTxtOverride(event.target.files?.[0])}
              />
            </label>
            {resumeIntelligence.sources.some((source) => source.source_kind === "admin_txt_override") ? (
              <button type="button" onClick={() => void handleRemoveOverride()} disabled={intelligencePending}>
                Remove override
              </button>
            ) : null}
            <button type="button" onClick={() => void handleRetryIntelligence()} disabled={intelligencePending}>
              {intelligencePending ? "Analyzing…" : "Retry analysis"}
            </button>
          </div>
        </section>
      ) : null}
      <section className={styles.controls}>
        <div className={styles.controlsTop}>
          <div className={styles.controlsIntro}>
            <h2 className={styles.controlsTitle}>
              {isAppliedView ? "Applied jobs" : canScrape ? "Apply for jobs" : "Stored jobs"}
            </h2>
            {controlsHint ? <p className={styles.controlsHint}>{controlsHint}</p> : null}
          </div>
          <div className={styles.controlsActions}>
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
                disabled={loadingPreviousSearch}
              >
                {isAppliedView
                  ? loadingStored
                    ? "Loading…"
                    : "Refresh applied jobs"
                  : loadingStored
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
                  const nextRole = event.target.value;
                  setInterestedRole(nextRole);
                  setKeywordsInput(suggestJobSearchKeywords(nextRole));
                  setSelectedPreviousSearch("");
                }}
                placeholder="e.g. Software Engineer, Data Analyst"
                className={styles.fieldInput}
                disabled={loadingPreviousSearch}
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
                disabled={!canScrape || loadingPreviousSearch}
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
                Resume skills
              </label>
              <textarea
                id="searchKeywords"
                rows={4}
                value={keywordsInput}
                onChange={(event) => {
                  setKeywordsInput(event.target.value);
                }}
                placeholder="Generated from resume skills. Add or edit comma-separated skills."
                className={`${styles.fieldInput} ${styles.keywordsTextarea}`}
                disabled={loadingPreviousSearch}
              />
              <span className={styles.fieldHelp}>
                LinkedIn jobs must match at least two skills in the description (title is
                ignored). Indeed jobs skip that rule.
                Review, remove, or add comma-separated skills before searching.
              </span>
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
                disabled={loadingPreviousSearch}
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
                disabled={loadingPreviousSearch}
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
              disabled={
                loadingPreviousSearch ||
                searchRequestInFlight ||
                scrapeInProgress ||
                resumeIntelligence.analysis?.status !== "completed" ||
                !resumeIntelligence.analysis?.category_id ||
                !resumeIntelligence.analysis?.canonical_search_title
              }
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
          {isAppliedView ? (
            <div className={styles.statPills}>
              <span className={styles.statPill}>
                <strong>{appliedCount}</strong> role{appliedCount === 1 ? "" : "s"} submitted
              </span>
            </div>
          ) : null}
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
                disabled={loadingPreviousSearch}
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
                  disabled={loadingPreviousSearch}
                >
                  <option value="all">All posting dates ({jobs.length})</option>
                  <option value="last_24h">Posted today / 24h ({freshnessCounts.last_24h})</option>
                  <option value="last_3d">Posted last 3 days ({freshnessCounts.last_3d})</option>
                  <option value="last_7d">Posted last 7 days ({freshnessCounts.last_7d})</option>
                  <option value="older">Posted 7+ days ago ({freshnessCounts.older})</option>
                </select>
              </div>
            ) : null}
            {!isAppliedView ? (
              <div className={styles.filterGroup}>
                <label htmlFor="jobSort" className={styles.fieldLabel}>
                  Sort by
                </label>
                <select
                  id="jobSort"
                  value={jobSort}
                  onChange={(event) => setJobSort(event.target.value as JobSort)}
                  className={styles.fieldSelect}
                  disabled={loadingPreviousSearch}
                >
                  <option value="best_match">Best match</option>
                  <option value="newest_posted">Most recent posted</option>
                  <option value="recently_scraped">Most recently scraped</option>
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
              You can switch to Tasks, Calendar, or other tabs — scraping continues in the
              background. New jobs appear here automatically as LinkedIn and Indeed finish.
            </p>
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
              ? `No jobs match at least two skills in the description (“${keywordsInput.trim()}”). Clear skills or adjust source filters.`
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
                onClick={() => {
                  setKeywordsInput("");
                }}
              >
                Clear skills
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <AdminJobList
          jobs={filteredJobs}
          viewMode={isAppliedView ? "applied" : "pipeline"}
          onToggleSelected={handleToggleSelected}
          onToggleApplied={handleToggleApplied}
          onUploadApplicationResume={handleUploadApplicationResume}
        />
      )}

      </div>

    </div>
  );
}
