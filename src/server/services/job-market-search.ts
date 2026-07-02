import { getApifyToken } from "@/server/services/apify-ats-score";
import { experienceYearsSearchHint } from "@/lib/format-experience-years";
import { extractJobPostedDate } from "@/lib/job-posted-date";

const APIFY_INDEED_ACTOR_ID = "misceres~indeed-scraper";
const APIFY_LINKEDIN_ACTOR_ID = "curious_coder~linkedin-jobs-scraper";

export type JobMarketSource = "indeed" | "linkedin";

export const JOB_MARKET_SOURCES: JobMarketSource[] = ["indeed", "linkedin"];

export type JobListing = {
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string;
  source: JobMarketSource;
  postedAt: string | null;
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
  postedAt?: string;
  datePublished?: string | number;
  dateOnIndeed?: string | number;
};

type ApifyLinkedInJob = {
  title?: string;
  companyName?: string;
  link?: string;
  location?: string;
  descriptionText?: string;
  description?: string;
  postedAt?: string;
  postedAtTimestamp?: number;
  postedDate?: string;
};

const IRRELEVANT_ROLE_PATTERN =
  /\b(copywriter|copy writer|content writer|technical writer|marketing writer|seo writer|blog writer|ghostwriter|grant writer|proposal writer|editorial assistant|translator|proofreader)\b/i;

const NON_TECH_WHEN_TECH_SEARCH =
  /\b(writer|copywriter|editor|translator|recruiter|sales rep|customer support)\b/i;

const TECH_SEARCH_PATTERN =
  /\b(engineer|developer|devops|data|analyst|software|frontend|backend|full.?stack|sre|machine learning|ml|ai|qa|tester|programmer|architect)\b/i;

function normalizeSearchFragment(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function fragmentIncludedIn(base: string, fragment: string): boolean {
  return base.toLowerCase().includes(fragment.toLowerCase());
}

export function parseKeywordFilterTokens(input: string): string[] {
  return input
    .split(/[,;\n]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 1);
}

export function jobMatchesKeywordFilter(
  job: {
    role: string;
    company: string;
    location?: string | null;
    jdText?: string | null;
  },
  keywordsInput: string,
): boolean {
  const tokens = parseKeywordFilterTokens(keywordsInput);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = [job.role, job.company, job.location ?? "", job.jdText ?? ""]
    .join(" ")
    .toLowerCase();

  return tokens.some((token) => haystack.includes(token));
}

/** Builds the job-board query from role, interest keywords, and experience (manager scrape). */
export function composeJobSearchPosition(input: {
  interestedRole?: string | null;
  interestedTechnology?: string | null;
  branch?: string | null;
  graduationDetails?: string | null;
  careerGoals?: string | null;
  specialization?: string | null;
  profileEducation?: string | null;
  experienceYears?: number | null;
  searchKeywords?: string | null;
}): string {
  const primaryRole =
    normalizeSearchFragment(input.interestedRole) ||
    normalizeSearchFragment(input.interestedTechnology) ||
    normalizeSearchFragment(input.specialization) ||
    normalizeSearchFragment(input.branch) ||
    normalizeSearchFragment(input.graduationDetails)?.slice(0, 80) ||
    normalizeSearchFragment(input.careerGoals)?.slice(0, 80) ||
    "software engineer";

  const supplements: string[] = [];
  for (const fragment of [
    input.interestedTechnology,
    input.branch,
    input.specialization,
    input.profileEducation,
  ]) {
    const normalized = normalizeSearchFragment(fragment);
    if (normalized && !fragmentIncludedIn(primaryRole, normalized)) {
      supplements.push(normalized.split(/\s+/).slice(0, 5).join(" "));
    }
  }

  if (input.searchKeywords?.trim()) {
    for (const token of parseKeywordFilterTokens(input.searchKeywords)) {
      if (!fragmentIncludedIn(primaryRole, token)) {
        supplements.push(token);
      }
    }
  }

  const experienceParts: string[] = [];
  if (input.experienceYears !== null && input.experienceYears !== undefined) {
    if (input.experienceYears === 0) {
      experienceParts.push("entry level");
    } else {
      experienceParts.push(
        input.experienceYears === 1 ? "1 year" : `${input.experienceYears} years`,
      );
    }

    const hint = experienceYearsSearchHint(input.experienceYears);
    if (hint) {
      experienceParts.push(hint.split(/\s+/).slice(0, 2).join(" "));
    }
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of [primaryRole, ...supplements, ...experienceParts]) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }

  return unique.join(" ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function buildJobSearchFromInterests(input: {
  interestedTechnology?: string | null;
  branch?: string | null;
  graduationDetails?: string | null;
  careerGoals?: string | null;
  experienceYears?: number | null;
  interestedRole?: string | null;
  specialization?: string | null;
  profileEducation?: string | null;
}): { position: string; location: string } {
  return {
    position: composeJobSearchPosition(input),
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
    postedAt: extractJobPostedDate(raw as Record<string, unknown>),
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
    postedAt: extractJobPostedDate(raw as Record<string, unknown>),
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

  return { jobs: dedupeJobs(jobs), errors };
}

export type ResolvedJobSource = JobMarketSource | "unknown";

export type JobListingSourceFilter = JobMarketSource | "all" | "other";

const NON_US_LOCATION_PATTERN =
  /\b(india|united kingdom|\buk\b|canada|germany|australia|europe|singapore|mexico|ireland|france|spain|italy|netherlands|brazil|japan|china|philippines|pakistan|dubai|uae|remote\s*-\s*(?!us|usa|united states))\b/i;

/** Best-effort check that a listing is US-focused (Jobilly default market). */
export function isUsaJobLocation(location: string | null | undefined): boolean {
  const loc = (location ?? "United States").trim().toLowerCase();
  if (!loc) {
    return true;
  }

  if (NON_US_LOCATION_PATTERN.test(loc)) {
    return false;
  }

  if (
    loc.includes("united states") ||
    loc === "us" ||
    loc.includes(" usa") ||
    loc.startsWith("usa,") ||
    loc.includes("u.s.")
  ) {
    return true;
  }

  if (/\b(remote|hybrid|on-site|onsite)\b/.test(loc)) {
    return true;
  }

  if (/, [A-Z]{2}\b/.test(location ?? "")) {
    return true;
  }

  return loc.includes("united states") || loc === "united states";
}

export function resolveJobSource(
  sourceValue: string | null | undefined,
  jobUrl: string,
): ResolvedJobSource {
  const source = (sourceValue ?? "").toLowerCase();
  const url = jobUrl.toLowerCase();

  if (source.includes("linkedin") || url.includes("linkedin.com")) {
    return "linkedin";
  }
  if (source.includes("indeed") || url.includes("indeed.com")) {
    return "indeed";
  }
  return "unknown";
}

function hostnameSourceLabel(jobUrl: string): string {
  try {
    const host = new URL(jobUrl).hostname.replace(/^www\./, "");
    const segment = host.split(".")[0] ?? host;
    if (!segment || segment === "com") {
      return "Other";
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  } catch {
    return "Other";
  }
}

export function formatJobSourceLabel(
  source: JobMarketSource | string,
  jobUrl?: string,
): string {
  const normalized = source.toLowerCase();
  const url = jobUrl?.toLowerCase() ?? "";

  if (normalized.includes("linkedin") || url.includes("linkedin.com")) {
    return "LinkedIn";
  }
  if (normalized.includes("indeed") || url.includes("indeed.com")) {
    return "Indeed";
  }
  if (normalized.includes("google")) {
    return "Google Jobs";
  }
  if (normalized.includes("jobright") || url.includes("jobright.ai")) {
    return "Jobright";
  }
  if (normalized.includes("remotive") || normalized.includes("apify")) {
    return "Legacy";
  }
  if (jobUrl) {
    return hostnameSourceLabel(jobUrl);
  }
  if (source.trim()) {
    return source.trim();
  }
  return "Other";
}

export function jobListingMatchesSource(
  sourceValue: string,
  filter: JobListingSourceFilter,
  jobUrl?: string,
  location?: string | null,
): boolean {
  if (filter === "all") {
    return true;
  }

  const resolved = jobUrl
    ? resolveJobSource(sourceValue, jobUrl)
    : resolveJobSource(sourceValue, "");

  if (filter === "other") {
    return resolved === "unknown" && isUsaJobLocation(location);
  }

  if (jobUrl) {
    return resolved === filter;
  }

  const normalized = sourceValue.toLowerCase().replace(/\s+/g, "_");
  return normalized.includes(filter);
}

export function countJobsBySource(
  jobs: Array<{ source: string; jobUrl: string; location?: string | null }>,
): {
  indeed: number;
  linkedin: number;
  other: number;
} {
  const counts = { indeed: 0, linkedin: 0, other: 0 };

  for (const job of jobs) {
    const resolved = resolveJobSource(job.source, job.jobUrl);
    if (resolved === "linkedin") {
      counts.linkedin += 1;
    } else if (resolved === "indeed") {
      counts.indeed += 1;
    } else if (isUsaJobLocation(job.location)) {
      counts.other += 1;
    }
  }

  return counts;
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
        "No jobs found on Indeed or LinkedIn.",
    };
  }

  return { jobs: result.jobs };
}
