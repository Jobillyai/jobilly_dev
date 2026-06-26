import { getApifyToken } from "@/server/services/apify-ats-score";

const APIFY_INDEED_ACTOR_ID = "misceres~indeed-scraper";
const APIFY_LINKEDIN_ACTOR_ID = "curious_coder~linkedin-jobs-scraper";
const APIFY_GOOGLE_JOBS_ACTOR_ID = "automation-lab~google-jobs-scraper";

export type JobMarketSource = "indeed" | "linkedin" | "google_jobs";

export const JOB_MARKET_SOURCES: JobMarketSource[] = [
  "indeed",
  "linkedin",
  "google_jobs",
];

export type JobListing = {
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string;
  source: JobMarketSource;
};

/** @deprecated Use JobListing — kept for existing imports. */
export type ApifyJobListing = JobListing;

type ApifyIndeedJob = {
  positionName?: string;
  title?: string;
  company?: string;
  url?: string;
  location?: string;
  description?: string;
};

type ApifyLinkedInJob = {
  title?: string;
  companyName?: string;
  link?: string;
  location?: string;
  descriptionText?: string;
  description?: string;
};

type ApifyGoogleJob = {
  title?: string;
  companyName?: string;
  company?: string;
  location?: string;
  description?: string;
  applyUrl?: string;
  url?: string;
  link?: string;
  jobUrl?: string;
};

const IRRELEVANT_ROLE_PATTERN =
  /\b(copywriter|copy writer|content writer|technical writer|marketing writer|seo writer|blog writer|ghostwriter|grant writer|proposal writer|editorial assistant|translator|proofreader)\b/i;

const NON_TECH_WHEN_TECH_SEARCH =
  /\b(writer|copywriter|editor|translator|recruiter|sales rep|customer support)\b/i;

const TECH_SEARCH_PATTERN =
  /\b(engineer|developer|devops|data|analyst|software|frontend|backend|full.?stack|sre|machine learning|ml|ai|qa|tester|programmer|architect)\b/i;

export function buildJobSearchFromInterests(input: {
  interestedTechnology?: string | null;
  branch?: string | null;
  graduationDetails?: string | null;
  careerGoals?: string | null;
}): { position: string; location: string } {
  const position =
    input.interestedTechnology?.trim() ||
    input.branch?.trim() ||
    input.graduationDetails?.trim() ||
    input.careerGoals?.trim()?.slice(0, 100) ||
    "software engineer";

  return {
    position,
    location: "United States",
  };
}

export const buildIndeedSearchFromInterests = buildJobSearchFromInterests;

function truncate(text: string, max = 1500): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1)}…`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isIrrelevantListing(role: string, searchPosition: string): boolean {
  if (IRRELEVANT_ROLE_PATTERN.test(role)) {
    return true;
  }

  if (TECH_SEARCH_PATTERN.test(searchPosition) && NON_TECH_WHEN_TECH_SEARCH.test(role)) {
    return true;
  }

  return false;
}

function buildLinkedInSearchUrl(position: string, location: string): string {
  const params = new URLSearchParams({
    keywords: position,
    location,
    f_TPR: "r604800",
  });
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

async function runApifyActor<T>(
  actorId: string,
  body: Record<string, unknown>,
  timeoutSeconds = 180,
): Promise<{ items: T[] } | { error: string }> {
  const token = getApifyToken();

  if (!token) {
    return {
      error: "Add APIFY_API_TOKEN or APIFY_KEY to search jobs.",
    };
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?timeout=${timeoutSeconds}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      error: `Apify request failed (${response.status}): ${errorBody.slice(0, 240)}`,
    };
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    return { error: "Apify returned an invalid job search payload." };
  }

  return { items: payload as T[] };
}

function normalizeIndeedJob(raw: ApifyIndeedJob): JobListing | null {
  const role = raw.positionName?.trim() || raw.title?.trim();
  const jobUrl = raw.url?.trim();
  const company = raw.company?.trim() || "Unknown company";

  if (!role || !jobUrl) {
    return null;
  }

  return {
    company,
    role,
    jobUrl,
    location: raw.location?.trim() || "United States",
    jdText: truncate(raw.description ?? ""),
    source: "indeed",
  };
}

function normalizeLinkedInJob(raw: ApifyLinkedInJob): JobListing | null {
  const role = raw.title?.trim();
  const jobUrl = raw.link?.trim();
  const company = raw.companyName?.trim() || "Unknown company";

  if (!role || !jobUrl) {
    return null;
  }

  const description = raw.descriptionText ?? raw.description ?? "";

  return {
    company,
    role,
    jobUrl,
    location: raw.location?.trim() || "United States",
    jdText: truncate(description),
    source: "linkedin",
  };
}

function normalizeGoogleJob(raw: ApifyGoogleJob): JobListing | null {
  const role = raw.title?.trim();
  const jobUrl =
    raw.applyUrl?.trim() ||
    raw.url?.trim() ||
    raw.link?.trim() ||
    raw.jobUrl?.trim();
  const company = raw.companyName?.trim() || raw.company?.trim() || "Unknown company";

  if (!role || !jobUrl) {
    return null;
  }

  const description = raw.description ? stripHtml(raw.description) : "";

  return {
    company,
    role,
    jobUrl,
    location: raw.location?.trim() || "United States",
    jdText: truncate(description),
    source: "google_jobs",
  };
}

function dedupeJobs(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  const unique: JobListing[] = [];

  for (const job of jobs) {
    if (seen.has(job.jobUrl)) {
      continue;
    }
    seen.add(job.jobUrl);
    unique.push(job);
  }

  return unique;
}

function filterRelevantJobs(jobs: JobListing[], searchPosition: string): JobListing[] {
  return jobs.filter((job) => !isIrrelevantListing(job.role, searchPosition));
}

export async function searchIndeedJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const result = await runApifyActor<ApifyIndeedJob>(APIFY_INDEED_ACTOR_ID, {
    country: "US",
    position: input.position,
    location: input.location ?? "United States",
    maxItems: input.maxItems ?? 20,
    saveOnlyUniqueItems: true,
    parseCompanyDetails: false,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  const jobs = filterRelevantJobs(
    dedupeJobs(
      result.items
        .map((item) => normalizeIndeedJob(item))
        .filter((job): job is JobListing => job !== null),
    ),
    input.position,
  ).slice(0, input.maxItems ?? 20);

  if (jobs.length === 0) {
    return { error: "Indeed returned no relevant jobs for this search." };
  }

  return { jobs };
}

export async function searchLinkedInJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const location = input.location ?? "United States";
  const searchUrl = buildLinkedInSearchUrl(input.position, location);

  const result = await runApifyActor<ApifyLinkedInJob>(
    APIFY_LINKEDIN_ACTOR_ID,
    {
      urls: [searchUrl],
      count: Math.max(10, input.maxItems ?? 20),
      scrapeCompany: false,
      splitByLocation: false,
    },
    240,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  const jobs = filterRelevantJobs(
    dedupeJobs(
      result.items
        .map((item) => normalizeLinkedInJob(item))
        .filter((job): job is JobListing => job !== null),
    ),
    input.position,
  ).slice(0, input.maxItems ?? 20);

  if (jobs.length === 0) {
    return { error: "LinkedIn returned no relevant jobs for this search." };
  }

  return { jobs };
}

export async function searchGoogleJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const location = input.location ?? "United States";

  const result = await runApifyActor<ApifyGoogleJob>(
    APIFY_GOOGLE_JOBS_ACTOR_ID,
    {
      queries: [input.position],
      location,
      maxResults: input.maxItems ?? 20,
      country: "us",
      language: "en",
    },
    240,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  const jobs = filterRelevantJobs(
    dedupeJobs(
      result.items
        .map((item) => normalizeGoogleJob(item))
        .filter((job): job is JobListing => job !== null),
    ),
    input.position,
  ).slice(0, input.maxItems ?? 20);

  if (jobs.length === 0) {
    return { error: "Google Jobs returned no relevant jobs for this search." };
  }

  return { jobs };
}

export async function searchJobsBySources(input: {
  position: string;
  location?: string;
  sources: JobMarketSource[];
  maxItemsPerSource?: number;
}): Promise<{ jobs: JobListing[]; errors: string[] }> {
  const jobs: JobListing[] = [];
  const errors: string[] = [];
  const maxItems = input.maxItemsPerSource ?? 20;
  const location = input.location ?? "United States";

  if (input.sources.includes("indeed")) {
    const indeed = await searchIndeedJobs({
      position: input.position,
      location,
      maxItems,
    });
    if ("error" in indeed) {
      errors.push(`Indeed: ${indeed.error}`);
    } else {
      jobs.push(...indeed.jobs);
    }
  }

  if (input.sources.includes("linkedin")) {
    const linkedin = await searchLinkedInJobs({
      position: input.position,
      location,
      maxItems,
    });
    if ("error" in linkedin) {
      errors.push(`LinkedIn: ${linkedin.error}`);
    } else {
      jobs.push(...linkedin.jobs);
    }
  }

  if (input.sources.includes("google_jobs")) {
    const googleJobs = await searchGoogleJobs({
      position: input.position,
      location,
      maxItems,
    });
    if ("error" in googleJobs) {
      errors.push(`Google Jobs: ${googleJobs.error}`);
    } else {
      jobs.push(...googleJobs.jobs);
    }
  }

  return { jobs: dedupeJobs(jobs), errors };
}

export type ResolvedJobSource = JobMarketSource | "unknown";

export function resolveJobSource(
  sourceValue: string | null | undefined,
  jobUrl: string,
): ResolvedJobSource {
  const source = (sourceValue ?? "").toLowerCase();
  const url = jobUrl.toLowerCase();

  if (
    source.includes("google") ||
    url.includes("google.com") ||
    url.includes("careers.google")
  ) {
    return "google_jobs";
  }
  if (source.includes("linkedin") || url.includes("linkedin.com")) {
    return "linkedin";
  }
  if (source.includes("indeed") || url.includes("indeed.com")) {
    return "indeed";
  }

  return "unknown";
}

export function formatJobSourceLabel(
  source: JobMarketSource | string,
  jobUrl?: string,
): string {
  const resolved = jobUrl ? resolveJobSource(source, jobUrl) : null;

  if (resolved === "google_jobs" || source.toLowerCase().includes("google")) {
    return "Google Jobs";
  }
  if (resolved === "linkedin" || source.toLowerCase().includes("linkedin")) {
    return "LinkedIn";
  }
  if (resolved === "indeed" || source.toLowerCase().includes("indeed")) {
    return "Indeed";
  }
  if (source.toLowerCase().includes("remotive")) {
    return "Legacy";
  }
  if (source.toLowerCase().includes("apify")) {
    return "Legacy";
  }
  return "Unknown";
}

export function jobListingMatchesSource(
  sourceValue: string,
  filter: JobMarketSource | "all",
  jobUrl?: string,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (jobUrl) {
    return resolveJobSource(sourceValue, jobUrl) === filter;
  }

  const normalized = sourceValue.toLowerCase().replace(/\s+/g, "_");
  return normalized.includes(filter);
}

export async function searchJobsWithApify(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const result = await searchJobsBySources({
    position: input.position,
    location: input.location,
    sources: [...JOB_MARKET_SOURCES],
    maxItemsPerSource: Math.ceil((input.maxItems ?? 30) / JOB_MARKET_SOURCES.length),
  });

  if (result.jobs.length === 0) {
    return {
      error:
        result.errors.join(" ") ||
        "No jobs found on Indeed, LinkedIn, or Google Jobs.",
    };
  }

  return { jobs: result.jobs };
}
