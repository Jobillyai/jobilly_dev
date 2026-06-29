import { createClient } from "@/server/db/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import type { AdminCandidate } from "@/server/services/admin-dashboard";
import {
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
  isScrapeCacheFresh,
  LEGACY_SEARCH_ROLE,
  normalizeSearchRole,
  sourceScrapeHadError,
  formatSearchRoleLabel,
  type RoleScrapeCacheStatus,
} from "@/server/services/job-role-cache";

export type CandidateJobListing = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string | null;
  relevanceScore: number;
  resumeMatch: "high" | "medium" | "low";
  selected: boolean;
  applied: boolean;
  appliedAt: string | null;
  scrapedAt: string;
  source: string;
  searchRole: string;
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
};

type ScrapedJobRow = {
  id: string;
  company: string;
  role: string;
  job_url: string;
  jd_text: string | null;
  relevance_score: number | null;
  selected: boolean;
  applied: boolean;
  applied_at: string | null;
  scraped_at: string;
  location: string | null;
  source: string | null;
  search_role: string;
  preparation_tips: string | null;
  candidate_viewed_at: string | null;
};

const JOB_SELECT =
  "id, company, role, job_url, jd_text, relevance_score, selected, applied, applied_at, scraped_at, location, source, search_role, preparation_tips, candidate_viewed_at";

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
    location: row.location ?? "United States",
    jdText: row.jd_text,
    relevanceScore: score,
    resumeMatch: score >= 70 ? "high" : score >= 45 ? "medium" : "low",
    selected: row.selected,
    applied: row.applied,
    appliedAt: row.applied_at,
    scrapedAt: row.scraped_at,
    source: row.source ?? "Indeed",
    searchRole: row.search_role,
  };
}

async function getRoleScrapeCache(
  candidateId: string,
  searchRole: string,
  sources: JobMarketSource[],
  db?: AppSupabase,
): Promise<RoleScrapeCacheStatus[]> {
  const supabase = await resolveDb(db);
  const { data } = await supabase
    .from("job_role_scrapes")
    .select("source, last_scraped_at")
    .eq("candidate_id", candidateId)
    .eq("search_role", searchRole)
    .in("source", sources);

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
): Promise<void> {
  const supabase = await resolveDb(db);
  await supabase.from("job_role_scrapes").upsert(
    {
      candidate_id: candidateId,
      search_role: searchRole,
      source,
      last_scraped_at: new Date().toISOString(),
    },
    { onConflict: "candidate_id,search_role,source" },
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
): Promise<{ inserted: number; error?: string }> {
  if (jobs.length === 0) {
    return { inserted: 0 };
  }

  const supabase = await resolveDb(db);
  const scrapedAt = new Date().toISOString();
  const existingUrls = await getExistingJobUrlsForRole(candidateId, searchRole, db);

  const rows = jobs
    .filter((job) => !existingUrls.has(job.jobUrl))
    .map((job) => ({
      candidate_id: candidateId,
      employee_id: adminUserId,
      search_role: searchRole,
      company: job.company,
      role: job.role,
      job_url: job.jobUrl,
      jd_text: job.jdText,
      relevance_score: job.relevanceScore,
      location: job.location,
      source: job.source,
      selected: false,
      applied: false,
      applied_at: null,
      scraped_at: scrapedAt,
    }));

  if (rows.length === 0) {
    return { inserted: 0 };
  }

  const { error } = await supabase.from("scraped_jobs").insert(rows);

  if (error) {
    return { inserted: 0, error: error.message };
  }

  return { inserted: rows.length };
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
  options?: { exactRoleOnly?: boolean },
): Promise<CandidateJobListing[]> {
  const supabase = await createClient();
  let query = supabase
    .from("scraped_jobs")
    .select(JOB_SELECT)
    .eq("candidate_id", candidateId)
    .order("relevance_score", { ascending: false });

  const normalizedRole = searchRole ? normalizeSearchRole(searchRole) : null;
  if (normalizedRole) {
    if (options?.exactRoleOnly) {
      query = query.eq("search_role", normalizedRole);
    } else {
      query = query.in("search_role", [normalizedRole, LEGACY_SEARCH_ROLE]);
    }
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return (data as ScrapedJobRow[]).map(mapDbRow);
}

export async function getCandidatePreviousSearches(
  candidateId: string,
): Promise<PreviousSearchRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scraped_jobs")
    .select("search_role, scraped_at")
    .eq("candidate_id", candidateId)
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
): Promise<{
  jobs: CandidateJobListing[];
  searchRole: string;
  cacheStatus: RoleScrapeCacheStatus[];
  label: string;
}> {
  const searchRole = normalizeSearchRole(storedSearchRole);
  const [jobs, cacheStatus] = await Promise.all([
    getCandidateJobListings(candidateId, searchRole, { exactRoleOnly: true }),
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
    .order("applied_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as ScrapedJobRow[])
    .filter((row) => row.applied_at)
    .map((row) => mapAppliedJobRow(row));
}

function mapAppliedJobRow(row: ScrapedJobRow): CandidateAppliedJob {
  const tips = parsePreparationTips(row.preparation_tips);
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    location: row.location ?? "United States",
    jdText: row.jd_text,
    appliedAt: row.applied_at as string,
    source: row.source ?? "Indeed",
    preparationTips:
      tips.length > 0
        ? tips
        : buildJobPreparationTips({
            role: row.role,
            company: row.company,
            jdText: row.jd_text,
          }),
    isNew: row.applied && !row.candidate_viewed_at,
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
): Promise<{
  jobs: CandidateJobListing[];
  searchRole: string;
  cacheStatus: RoleScrapeCacheStatus[];
}> {
  const searchRole = normalizeSearchRole(interestedRole);
  const [jobs, cacheStatus] = await Promise.all([
    getCandidateJobListings(candidateId, searchRole),
    getRoleScrapeCache(candidateId, searchRole, [...JOB_MARKET_SOURCES]),
  ]);

  return { jobs, searchRole, cacheStatus };
}

export async function refreshCandidateJobListings(
  candidate: AdminCandidate,
  adminUserId: string,
  sources: JobMarketSource[] = [...JOB_MARKET_SOURCES],
  interestedRole?: string | null,
  options?: { allowScrape?: boolean; db?: AppSupabase; forceScrape?: boolean },
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

  const searchRole = normalizeSearchRole(roleInput);
  const searchTerms = buildCandidateSearchTerms(candidate, roleInput);
  const { position, location } = buildCandidateJobSearchQuery(candidate, roleInput);
  const searchQuery = `${position} · ${location}`;

  const allowScrape = options?.allowScrape ?? false;
  const forceScrape = options?.forceScrape ?? false;
  const db = options?.db;

  const cacheStatus = await getRoleScrapeCache(candidate.id, searchRole, sources, db);
  const sourcesToScrape = forceScrape
    ? sources
    : cacheStatus.filter((entry) => !entry.fresh).map((entry) => entry.source);

  let scrapeErrors: string[] = [];
  let newJobsAdded = 0;
  let scrapeCalled = false;

  if (sourcesToScrape.length > 0 && allowScrape) {
    scrapeCalled = true;

    for (const source of sourcesToScrape) {
      const scraped = await scrapeJobsForCandidate(
        candidate,
        [source],
        roleInput,
      );
      scrapeErrors.push(...scraped.errors);

      const appendResult = await appendJobsForRole(
        candidate.id,
        adminUserId,
        searchRole,
        scraped.jobs,
        db,
      );
      newJobsAdded += appendResult.inserted;

      if (appendResult.error) {
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
          ),
          scrapeCalled,
          newJobsAdded,
          error: appendResult.error,
          warning: scrapeErrors.length > 0 ? scrapeErrors.join(" ") : undefined,
        };
      }

      if (!sourceScrapeHadError(source, scraped.errors)) {
        await markRoleScraped(candidate.id, searchRole, source, db);
      }
    }
  }

  const updatedCacheStatus = await getRoleScrapeCache(
    candidate.id,
    searchRole,
    sources,
    db,
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
        "No stored jobs for this role yet. The manager refreshes listings every 3 hours.",
    };
  }

  if (!allowScrape && sourcesToScrape.length > 0 && jobs.length > 0) {
    const info =
      describeCacheStatus(updatedCacheStatus, sources) ||
      "Showing stored jobs from the manager's last scrape.";
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
      "Job search completed but no new unique jobs were found for this role.";
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
    })
    .eq("id", jobId)
    .eq("candidate_id", candidateId);

  return !error;
}
