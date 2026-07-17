import { createClient } from "@/server/db/supabase-server";
import { createAdminClient } from "@/server/db/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import type { AdminCandidate } from "@/server/services/admin-dashboard";
import {
  isJobrightListing,
  JOB_MARKET_SOURCES,
  type JobMarketSource,
} from "@/server/services/job-market-search";
import {
  buildCandidateJobSearchQuery,
  buildCandidateSearchTerms,
  scrapeJobsForCandidate,
  type JobSearchResult,
} from "@/server/services/candidate-job-search";
import {
  buildJobPreparationTips,
  parsePreparationTips,
  serializePreparationTips,
} from "@/server/services/job-preparation-tips";
import {
  describeCacheStatus,
  describeScrapeWindow,
  isScrapeCacheFresh,
  normalizeSearchRole,
  resolveScrapeWindow,
  sourceScrapeHadError,
  formatSearchRoleLabel,
  type RoleScrapeCacheStatus,
} from "@/server/services/job-role-cache";
import { createSignedResumeUrl } from "@/server/services/resume-storage";
import { JOB_CLASSIFIER_VERSION, type StrictJobIntent } from "@/lib/job-category-taxonomy";
import { getConfirmedStrictIntent } from "@/server/services/resume-intelligence";

export type JobListingViewMode = "pipeline" | "applied";

export type CandidateJobListing = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  applyUrl: string | null;
  location: string;
  jdText: string | null;
  relevanceScore: number;
  resumeMatch: "high" | "medium" | "low";
  selected: boolean;
  applied: boolean;
  appliedAt: string | null;
  scrapedAt: string;
  postedAt: string | null;
  source: string;
  searchRole: string;
  applicationResumeFileName: string | null;
  applicationResumeDownloadUrl: string | null;
};

export type CandidateAppliedJob = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string | null;
  appliedAt: string;
  source: string;
  preparationTips: string[];
  isNew: boolean;
  hasApplicationResume: boolean;
  applicationResumeFileName: string | null;
  applicationResumeDownloadUrl: string | null;
};

type ScrapedJobRow = {
  id: string;
  company: string;
  role: string;
  job_url: string;
  apply_url: string | null;
  jd_text: string | null;
  relevance_score: number | null;
  selected: boolean;
  applied: boolean;
  applied_at: string | null;
  scraped_at: string;
  posted_at: string | null;
  location: string | null;
  source: string | null;
  search_role: string;
  preparation_tips: string | null;
  candidate_viewed_at: string | null;
  application_resume_path: string | null;
  application_resume_file_name: string | null;
};

const JOB_SELECT =
  "id, company, role, job_url, apply_url, jd_text, relevance_score, selected, applied, applied_at, scraped_at, posted_at, location, source, search_role, preparation_tips, candidate_viewed_at, application_resume_path, application_resume_file_name";

type AppSupabase = SupabaseClient<Database>;

async function resolveDb(client?: AppSupabase): Promise<AppSupabase> {
  return client ?? (await createClient());
}

function mapDbRow(row: ScrapedJobRow): CandidateJobListing {
  const score = row.relevance_score ?? 0;
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    applyUrl: row.apply_url,
    location: row.location ?? "United States",
    jdText: row.jd_text,
    relevanceScore: score,
    resumeMatch: score >= 70 ? "high" : score >= 45 ? "medium" : "low",
    selected: row.selected,
    applied: row.applied,
    appliedAt: row.applied_at,
    scrapedAt: row.scraped_at,
    postedAt: row.posted_at,
    source: row.source ?? "Unknown",
    searchRole: row.search_role,
    applicationResumeFileName: row.application_resume_file_name,
    applicationResumeDownloadUrl: null,
  };
}

async function attachApplicationResumeUrls(
  rows: ScrapedJobRow[],
): Promise<CandidateJobListing[]> {
  return Promise.all(
    rows
      .filter((row) => !isJobrightListing(row.source, row.job_url))
      .map(async (row) => {
      const listing = mapDbRow(row);
      if (!row.application_resume_path) {
        return listing;
      }

      const downloadUrl = await createSignedResumeUrl(row.application_resume_path);
      return {
        ...listing,
        applicationResumeDownloadUrl: downloadUrl,
      };
    }),
  );
}

async function getRoleScrapeCache(
  candidateId: string,
  searchRole: string,
  sources: JobMarketSource[],
  db?: AppSupabase,
  intentFingerprint?: string,
): Promise<RoleScrapeCacheStatus[]> {
  const supabase = await resolveDb(db);
  let query = supabase
    .from("job_role_scrapes")
    .select("source, last_scraped_at")
    .eq("candidate_id", candidateId)
    .in("source", sources);
  query = intentFingerprint
    ? query.eq("intent_fingerprint", intentFingerprint)
    : query.eq("search_role", searchRole);
  const { data } = await query;

  const bySource = new Map(
    (data ?? []).map((row) => [row.source as JobMarketSource, row.last_scraped_at]),
  );

  return sources.map((source) => {
    const lastScrapedAt = bySource.get(source) ?? null;
    return {
      source,
      lastScrapedAt,
      fresh: isScrapeCacheFresh(lastScrapedAt),
    };
  });
}

async function markRoleScraped(
  candidateId: string,
  searchRole: string,
  source: JobMarketSource,
  db?: AppSupabase,
  intent?: StrictJobIntent,
): Promise<void> {
  const supabase = await resolveDb(db);
  await supabase.from("job_role_scrapes").upsert(
    {
      candidate_id: candidateId,
      search_role: searchRole,
      source,
      last_scraped_at: new Date().toISOString(),
      intent_fingerprint: intent?.intentFingerprint ?? "legacy",
      target_category: intent?.categoryId ?? null,
      classifier_version: intent ? JOB_CLASSIFIER_VERSION : null,
    },
    { onConflict: "candidate_id,intent_fingerprint,source" },
  );
}

async function getExistingJobUrlsForRole(
  candidateId: string,
  searchRole: string,
  db?: AppSupabase,
): Promise<Set<string>> {
  const supabase = await resolveDb(db);
  const { data } = await supabase
    .from("scraped_jobs")
    .select("job_url")
    .eq("candidate_id", candidateId)
    .eq("search_role", searchRole);

  return new Set((data ?? []).map((row) => row.job_url));
}

async function appendJobsForRole(
  candidateId: string,
  adminUserId: string,
  searchRole: string,
  jobs: JobSearchResult[],
  db?: AppSupabase,
  intent?: StrictJobIntent,
): Promise<{ inserted: number; updated: number; error?: string }> {
  if (jobs.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  const supabase = await resolveDb(db);
  const scrapedAt = new Date().toISOString();
  const existingUrls = await getExistingJobUrlsForRole(candidateId, searchRole, db);
  const batchUrls = new Set<string>();

  const newRows = jobs
    .filter((job) => {
      if (isJobrightListing(job.source, job.jobUrl)) {
        return false;
      }
      if (existingUrls.has(job.jobUrl) || batchUrls.has(job.jobUrl)) {
        return false;
      }
      batchUrls.add(job.jobUrl);
      return true;
    })
    .map((job) => ({
      candidate_id: candidateId,
      employee_id: adminUserId,
      search_role: searchRole,
      company: job.company,
      role: job.role,
      job_url: job.jobUrl,
      apply_url: job.applyUrl ?? null,
      jd_text: job.jdText,
      relevance_score: job.relevanceScore,
      location: job.location,
      source: job.source,
      selected: false,
      applied: false,
      applied_at: null,
      scraped_at: scrapedAt,
      posted_at: job.postedAt,
      target_category: intent?.categoryId ?? null,
      detected_category: job.detectedCategory ?? null,
      category_confidence: job.categoryConfidence ?? null,
      classifier_version: intent ? JOB_CLASSIFIER_VERSION : null,
      intent_fingerprint: intent?.intentFingerprint ?? null,
    }));

  let inserted = 0;
  if (newRows.length > 0) {
    const { error } = await supabase.from("scraped_jobs").upsert(newRows, {
      onConflict: "candidate_id,search_role,job_url",
      ignoreDuplicates: true,
    });

    if (error) {
      return { inserted: 0, updated: 0, error: error.message };
    }

    inserted = newRows.length;
  }

  const jobsToRefresh = jobs.filter(
    (job) =>
      !isJobrightListing(job.source, job.jobUrl) && existingUrls.has(job.jobUrl),
  );

  let updated = 0;
  for (const job of jobsToRefresh) {
    const { error } = await supabase
      .from("scraped_jobs")
      .update({
        apply_url: job.applyUrl ?? null,
        jd_text: job.jdText,
        relevance_score: job.relevanceScore,
        posted_at: job.postedAt,
        scraped_at: scrapedAt,
        location: job.location,
        source: job.source,
      })
      .eq("candidate_id", candidateId)
      .eq("search_role", searchRole)
      .eq("job_url", job.jobUrl);

    if (error) {
      return { inserted, updated, error: error.message };
    }

    updated += 1;
  }

  return { inserted, updated };
}

export type PreviousSearchRole = {
  searchRole: string;
  label: string;
  jobCount: number;
  lastScrapedAt: string;
};

export async function getCandidateJobListings(
  candidateId: string,
  searchRole?: string | null,
  options?: {
    exactRoleOnly?: boolean;
    viewMode?: JobListingViewMode;
  },
): Promise<CandidateJobListing[]> {
  const supabase = await createClient();
  const viewMode = options?.viewMode ?? "pipeline";
  let query = supabase.from("scraped_jobs").select(JOB_SELECT).eq("candidate_id", candidateId);

  if (viewMode === "pipeline") {
    query = query
      .eq("applied", false)
      .order("scraped_at", { ascending: false })
      .order("relevance_score", { ascending: false });
  } else {
    query = query.eq("applied", true).order("applied_at", { ascending: false });
  }

  const normalizedRole = searchRole ? normalizeSearchRole(searchRole) : null;
  if (normalizedRole) {
    query = query.eq("search_role", normalizedRole).not("intent_fingerprint", "is", null);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return attachApplicationResumeUrls(data as ScrapedJobRow[]);
}

export async function getCandidateAppliedJobCount(
  candidateId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("scraped_jobs")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId)
    .eq("applied", true)
    .not("intent_fingerprint", "is", null);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getCandidateAppliedJobListings(
  candidateId: string,
  searchRole?: string | null,
): Promise<CandidateJobListing[]> {
  return getCandidateJobListings(candidateId, searchRole, { viewMode: "applied" });
}

export async function getCandidatePreviousSearches(
  candidateId: string,
): Promise<PreviousSearchRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scraped_jobs")
    .select("search_role, scraped_at")
    .eq("candidate_id", candidateId)
    .not("intent_fingerprint", "is", null)
    .order("scraped_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const byRole = new Map<string, { jobCount: number; lastScrapedAt: string }>();

  for (const row of data) {
    const role = row.search_role;
    const current = byRole.get(role);

    if (!current) {
      byRole.set(role, { jobCount: 1, lastScrapedAt: row.scraped_at });
      continue;
    }

    current.jobCount += 1;
    if (row.scraped_at > current.lastScrapedAt) {
      current.lastScrapedAt = row.scraped_at;
    }
  }

  return [...byRole.entries()]
    .map(([searchRole, stats]) => ({
      searchRole,
      label: formatSearchRoleLabel(searchRole),
      jobCount: stats.jobCount,
      lastScrapedAt: stats.lastScrapedAt,
    }))
    .sort((a, b) => b.lastScrapedAt.localeCompare(a.lastScrapedAt));
}

export async function loadCandidateJobsForStoredRole(
  candidateId: string,
  storedSearchRole: string,
  viewMode: JobListingViewMode = "pipeline",
): Promise<{
  jobs: CandidateJobListing[];
  searchRole: string;
  cacheStatus: RoleScrapeCacheStatus[];
  label: string;
}> {
  const searchRole = normalizeSearchRole(storedSearchRole);
  const [jobs, cacheStatus] = await Promise.all([
    getCandidateJobListings(candidateId, searchRole, {
      exactRoleOnly: true,
      viewMode,
    }),
    getRoleScrapeCache(candidateId, searchRole, [...JOB_MARKET_SOURCES]),
  ]);

  return {
    jobs,
    searchRole,
    cacheStatus,
    label: formatSearchRoleLabel(searchRole),
  };
}

export async function getCandidateAppliedJobs(
  candidateId: string,
): Promise<CandidateAppliedJob[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scraped_jobs")
    .select(JOB_SELECT)
    .eq("candidate_id", candidateId)
    .eq("applied", true)
    .not("intent_fingerprint", "is", null)
    .order("applied_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return Promise.all(
    (data as ScrapedJobRow[])
      .filter((row) => row.applied_at && !isJobrightListing(row.source, row.job_url))
      .map((row) => mapAppliedJobRow(row)),
  );
}

async function mapAppliedJobRow(row: ScrapedJobRow): Promise<CandidateAppliedJob> {
  const tips = parsePreparationTips(row.preparation_tips);
  const downloadUrl = row.application_resume_path
    ? await createSignedResumeUrl(row.application_resume_path)
    : null;

  return {
    id: row.id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    location: row.location ?? "United States",
    jdText: row.jd_text,
    appliedAt: row.applied_at as string,
    source: row.source ?? "Unknown",
    preparationTips:
      tips.length > 0
        ? tips
        : buildJobPreparationTips({
            role: row.role,
            company: row.company,
            jdText: row.jd_text,
          }),
    isNew: row.applied && !row.candidate_viewed_at,
    hasApplicationResume: Boolean(row.application_resume_path),
    applicationResumeFileName: row.application_resume_file_name,
    applicationResumeDownloadUrl: downloadUrl,
  };
}

export async function getUnreadAppliedJobCount(candidateId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("scraped_jobs")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId)
    .eq("applied", true)
    .is("candidate_viewed_at", null);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function markAppliedJobsAsViewed(candidateId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("scraped_jobs")
    .update({ candidate_viewed_at: new Date().toISOString() })
    .eq("candidate_id", candidateId)
    .eq("applied", true)
    .is("candidate_viewed_at", null);
}

export async function loadCandidateJobsForRole(
  candidateId: string,
  interestedRole: string,
  viewMode: JobListingViewMode = "pipeline",
): Promise<{
  jobs: CandidateJobListing[];
  searchRole: string;
  cacheStatus: RoleScrapeCacheStatus[];
}> {
  const searchRole = normalizeSearchRole(interestedRole);
  const [jobs, cacheStatus] = await Promise.all([
    getCandidateJobListings(candidateId, searchRole, { viewMode }),
    getRoleScrapeCache(candidateId, searchRole, [...JOB_MARKET_SOURCES]),
  ]);

  return { jobs, searchRole, cacheStatus };
}

export async function runCandidateJobScrapeForSources(input: {
  candidate: AdminCandidate;
  adminUserId: string;
  sources: JobMarketSource[];
  interestedRole: string;
  searchKeywords?: string | null;
  db?: AppSupabase;
}): Promise<{
  newJobsAdded: number;
  scrapeErrors: string[];
  fatalError?: string;
  windowInfo?: string;
  rejectedCount: number;
}> {
  const intent = await getConfirmedStrictIntent(input.candidate.id);
  const searchRole = normalizeSearchRole(intent.canonicalSearchTitle);
  const searchKeywords = intent.searchKeywords.join(" ");

  // Windowed scraping: the first scrape for a candidate+role looks back 15
  // days; each later scrape only covers the gap since that source's last
  // successful scrape (3h cache TTL, overnight logouts, weekends — all
  // covered because the window always starts at the last success).
  const cacheStatus = await getRoleScrapeCache(
    input.candidate.id,
    searchRole,
    input.sources,
    input.db,
    intent.intentFingerprint,
  );
  const lastScrapedBySource = new Map(
    cacheStatus.map((entry) => [entry.source, entry.lastScrapedAt]),
  );

  // Describe the widest window among the scraped sources (first scrape wins,
  // otherwise the source with the oldest previous success).
  const lastScrapes = input.sources.map(
    (source) => lastScrapedBySource.get(source) ?? null,
  );
  const oldestLastScrape = lastScrapes.includes(null)
    ? null
    : (lastScrapes as string[]).sort()[0] ?? null;
  const widestWindow = resolveScrapeWindow(oldestLastScrape);

  const results = await Promise.all(
    input.sources.map(async (source) => {
      const postedWithin = resolveScrapeWindow(lastScrapedBySource.get(source));
      const scraped = await scrapeJobsForCandidate(
        input.candidate,
        [source],
        input.interestedRole,
        {
          experienceYears: input.candidate.experienceYears,
          searchKeywords,
          postedWithin,
          strictIntent: intent,
        },
      );

      const appendResult = await appendJobsForRole(
        input.candidate.id,
        input.adminUserId,
        searchRole,
        scraped.jobs,
        input.db,
        intent,
      );

      if (appendResult.error) {
        return {
          newJobsAdded: 0,
          scrapeErrors: scraped.errors,
          fatalError: appendResult.error,
          rejectedCount: scraped.rejectedCount,
        };
      }

      if (!sourceScrapeHadError(source, scraped.errors)) {
        await markRoleScraped(input.candidate.id, searchRole, source, input.db, intent);
      }

      return {
        newJobsAdded: appendResult.inserted,
        scrapeErrors: scraped.errors,
        fatalError: undefined as string | undefined,
        rejectedCount: scraped.rejectedCount,
      };
    }),
  );

  const scrapeErrors = results.flatMap((result) => result.scrapeErrors);
  const newJobsAdded = results.reduce((sum, result) => sum + result.newJobsAdded, 0);
  const fatalError = results.find((result) => result.fatalError)?.fatalError;
  const rejectedCount = results.reduce((sum, result) => sum + result.rejectedCount, 0);
  await createAdminClient().from("audit_log").insert({
    actor_user_id: input.adminUserId,
    action: "strict_job_scrape_executed",
    target: `candidate:${input.candidate.id}:category:${intent.categoryId}:accepted:${newJobsAdded}:rejected:${rejectedCount}`,
  });

  return {
    newJobsAdded,
    scrapeErrors,
    fatalError,
    windowInfo: describeScrapeWindow(widestWindow),
    rejectedCount,
  };
}

export async function refreshCandidateJobListings(
  candidate: AdminCandidate,
  adminUserId: string,
  sources: JobMarketSource[] = [...JOB_MARKET_SOURCES],
  interestedRole?: string | null,
  options?: {
    allowScrape?: boolean;
    db?: AppSupabase;
    forceScrape?: boolean;
    searchKeywords?: string | null;
  },
): Promise<{
  jobs: CandidateJobListing[];
  searchTerms: string[];
  searchQuery: string;
  searchRole: string;
  cacheStatus: RoleScrapeCacheStatus[];
  scrapeCalled: boolean;
  newJobsAdded: number;
  error?: string;
  warning?: string;
  info?: string;
}> {
  const roleInput = interestedRole?.trim();
  if (!roleInput) {
    return {
      jobs: [],
      searchTerms: [],
      searchQuery: "",
      searchRole: "",
      cacheStatus: [],
      scrapeCalled: false,
      newJobsAdded: 0,
      error: "Enter an interested role before searching.",
    };
  }

  let intent: StrictJobIntent;
  try {
    intent = await getConfirmedStrictIntent(candidate.id);
  } catch (error) {
    return {
      jobs: [], searchTerms: [], searchQuery: "", searchRole: "", cacheStatus: [],
      scrapeCalled: false, newJobsAdded: 0,
      error: error instanceof Error ? error.message : "Confirm resume intelligence first.",
    };
  }
  const searchRole = normalizeSearchRole(intent.canonicalSearchTitle);
  const searchKeywords = intent.searchKeywords.join(" ");
  const searchTerms = buildCandidateSearchTerms(
    candidate,
    intent.canonicalSearchTitle,
    candidate.experienceYears,
    searchKeywords,
  );
  const { position, location } = buildCandidateJobSearchQuery(candidate, intent.canonicalSearchTitle, {
    experienceYears: candidate.experienceYears,
    searchKeywords,
  });
  const searchQuery = `${position} · ${location}`;

  const allowScrape = options?.allowScrape ?? false;
  const forceScrape = options?.forceScrape ?? false;
  const db = options?.db;

  const cacheStatus = await getRoleScrapeCache(
    candidate.id, searchRole, sources, db, intent.intentFingerprint,
  );
  const sourcesToScrape = forceScrape
    ? sources
    : cacheStatus.filter((entry) => !entry.fresh).map((entry) => entry.source);

  const existingJobCount = (
    await getCandidateJobListings(candidate.id, searchRole)
  ).length;

  const scrapeErrors: string[] = [];
  let newJobsAdded = 0;
  let scrapeCalled = false;

  if (sourcesToScrape.length > 0 && allowScrape) {
    scrapeCalled = true;

    const scrapeResult = await runCandidateJobScrapeForSources({
      candidate,
      adminUserId,
      sources: sourcesToScrape,
      interestedRole: roleInput,
      searchKeywords,
      db,
    });
    scrapeErrors.push(...scrapeResult.scrapeErrors);
    newJobsAdded = scrapeResult.newJobsAdded;

    if (scrapeResult.fatalError) {
      return {
        jobs: await getCandidateJobListings(candidate.id, searchRole),
        searchTerms,
        searchQuery,
        searchRole,
        cacheStatus: await getRoleScrapeCache(
          candidate.id,
          searchRole,
          sources,
          db,
          intent.intentFingerprint,
        ),
        scrapeCalled,
        newJobsAdded,
        error: scrapeResult.fatalError,
        warning: scrapeErrors.length > 0 ? scrapeErrors.join(" ") : undefined,
      };
    }
  }

  const updatedCacheStatus = await getRoleScrapeCache(
    candidate.id,
    searchRole,
    sources,
    db,
    intent.intentFingerprint,
  );
  const jobs = await getCandidateJobListings(candidate.id, searchRole);

  if (!allowScrape && sourcesToScrape.length > 0 && jobs.length === 0) {
    return {
      jobs: [],
      searchTerms,
      searchQuery,
      searchRole,
      cacheStatus: updatedCacheStatus,
      scrapeCalled: false,
      newJobsAdded: 0,
      info:
        "No stored jobs for this role yet. Search from the job sheet (once every 3 hours per role).",
    };
  }

  if (!allowScrape && sourcesToScrape.length > 0 && jobs.length > 0) {
    const info =
      describeCacheStatus(updatedCacheStatus, sources) ||
      "Showing stored jobs from the last search — new searches run once every 3 hours per role.";
    return {
      jobs,
      searchTerms,
      searchQuery,
      searchRole,
      cacheStatus: updatedCacheStatus,
      scrapeCalled: false,
      newJobsAdded: 0,
      info,
    };
  }

  if (jobs.length === 0) {
    return {
      jobs: [],
      searchTerms,
      searchQuery,
      searchRole,
      cacheStatus: updatedCacheStatus,
      scrapeCalled,
      newJobsAdded,
      error:
        scrapeErrors.join(" ") ||
        "No jobs found for this role yet. Try again after 3 hours or adjust the role.",
    };
  }

  const info = describeCacheStatus(updatedCacheStatus, sources);
  let warning = scrapeErrors.length > 0 ? scrapeErrors.join(" ") : undefined;

  if (!scrapeCalled && info) {
    return {
      jobs,
      searchTerms,
      searchQuery,
      searchRole,
      cacheStatus: updatedCacheStatus,
      scrapeCalled,
      newJobsAdded,
      info,
    };
  }

  if (scrapeCalled && newJobsAdded === 0 && !warning) {
    warning =
      existingJobCount > 0
        ? `Job search completed but no new unique jobs were found — your ${existingJobCount} stored job${existingJobCount === 1 ? "" : "s"} for this role are unchanged.`
        : "Job search completed but no new unique jobs were found for this role.";
  }

  if (scrapeCalled && newJobsAdded > 0 && existingJobCount > 0 && !info) {
    return {
      jobs,
      searchTerms,
      searchQuery,
      searchRole,
      cacheStatus: updatedCacheStatus,
      scrapeCalled,
      newJobsAdded,
      info: `Appended ${newJobsAdded} new job${newJobsAdded === 1 ? "" : "s"} to ${existingJobCount} existing (${jobs.length} total for this role).`,
      warning,
    };
  }

  return {
    jobs,
    searchTerms,
    searchQuery,
    searchRole,
    cacheStatus: updatedCacheStatus,
    scrapeCalled,
    newJobsAdded,
    info: info || undefined,
    warning,
  };
}

export async function setCandidateJobSelected(
  jobId: string,
  candidateId: string,
  selected: boolean,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scraped_jobs")
    .update({ selected })
    .eq("id", jobId)
    .eq("candidate_id", candidateId);

  return !error;
}

export async function setCandidateJobApplied(
  jobId: string,
  candidateId: string,
  applied: boolean,
): Promise<boolean> {
  const supabase = await createClient();

  if (applied) {
    const { data: job } = await supabase
      .from("scraped_jobs")
      .select("role, company, jd_text")
      .eq("id", jobId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (!job) {
      return false;
    }

    const tips = buildJobPreparationTips({
      role: job.role,
      company: job.company,
      jdText: job.jd_text,
    });

    const { error } = await supabase
      .from("scraped_jobs")
      .update({
        applied: true,
        applied_at: new Date().toISOString(),
        preparation_tips: serializePreparationTips(tips),
        candidate_viewed_at: null,
      })
      .eq("id", jobId)
      .eq("candidate_id", candidateId);

    return !error;
  }

  const { error } = await supabase
    .from("scraped_jobs")
    .update({
      applied: false,
      applied_at: null,
      preparation_tips: null,
      candidate_viewed_at: null,
      application_resume_path: null,
      application_resume_file_name: null,
    })
    .eq("id", jobId)
    .eq("candidate_id", candidateId);

  return !error;
}

export async function setAppliedJobResume(
  jobId: string,
  candidateId: string,
  storagePath: string,
  fileName: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("scraped_jobs")
    .update({
      application_resume_path: storagePath,
      application_resume_file_name: fileName,
    })
    .eq("id", jobId)
    .eq("candidate_id", candidateId)
    .eq("applied", true);

  return !error;
}
