import { getApifyToken } from "@/server/services/apify-client";
import { experienceLevelSearchTerms } from "@/lib/format-experience-years";
import { extractJobPostedDate } from "@/lib/job-posted-date";
import {
  countMatchedJobKeywords,
  parseJobSearchKeywords,
} from "@/lib/job-keyword-match";
import {
  buildFortune500SearchPosition,
  hasFortuneCompanySignal,
  loadFortune500Companies,
  selectFortuneCompanyBatch,
} from "@/lib/fortune500-job-search";

const APIFY_GLASSDOOR_ACTOR_ID = "automation-lab~glassdoor-jobs-scraper";
const APIFY_ZIPRECRUITER_ACTOR_ID = "piotrv1001~ziprecruiter-jobs-scraper";
const APIFY_INDEED_ACTOR_ID = "misceres~indeed-scraper";
const APIFY_LINKEDIN_ACTOR_ID = "curious_coder~linkedin-jobs-scraper";

export type JobMarketSource = "indeed" | "linkedin" | "glassdoor" | "ziprecruiter";

/** Active scrape sources — run in parallel; each writes to DB as it finishes. */
export const JOB_MARKET_SOURCES: JobMarketSource[] = ["linkedin", "indeed"];

export const JOB_MARKET_SOURCE_LABELS: Record<JobMarketSource, string> = {
  indeed: "Indeed",
  linkedin: "LinkedIn",
  glassdoor: "Glassdoor",
  ziprecruiter: "ZipRecruiter",
};

export type JobListingSource = JobMarketSource;

export type JobListing = {
  company: string;
  role: string;
  jobUrl: string;
  applyUrl?: string | null;
  location: string;
  jdText: string;
  source: JobListingSource;
  postedAt: string | null;
};

/** @deprecated Use JobListing — kept for existing imports. */
export type ApifyJobListing = JobListing;

type ApifyGlassdoorJob = {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  jobUrl?: string;
  postedDate?: string;
  salary?: string;
};

type ApifyZipRecruiterJob = {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  jobUrl?: string;
  postedDate?: string | null;
  scrapedAt?: string;
};

type ApifyIndeedJob = {
  positionName?: string;
  title?: string;
  company?: string;
  url?: string;
  location?: string;
  description?: string;
  descriptionHTML?: string;
  jobDescription?: string;
  postedAt?: string;
  datePublished?: string | number;
  dateOnIndeed?: string | number;
};

type ApifyLinkedInJob = {
  title?: string;
  companyName?: string;
  link?: string;
  applyUrl?: string;
  location?: string;
  descriptionText?: string;
  description?: string;
  jobDescription?: string;
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
  const keywords = parseJobSearchKeywords(keywordsInput);
  if (keywords.length === 0) {
    return true;
  }
  return (
    countMatchedJobKeywords(keywords, { jdText: job.jdText }) >=
    Math.min(2, keywords.length)
  );
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
    experienceParts.push(...experienceLevelSearchTerms(input.experienceYears).slice(0, 2));
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

const ROLE_STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "for",
  "with",
  "intern",
  "internship",
]);

/** Server-side relevance gate for scraped listings (role + optional keywords). */
export function jobMatchesSearchCriteria(
  job: {
    role: string;
    company: string;
    location?: string | null;
    jdText?: string | null;
  },
  interestedRole: string,
  searchKeywords?: string | null,
): boolean {
  if (searchKeywords?.trim() && !jobMatchesKeywordFilter(job, searchKeywords)) {
    return false;
  }

  const roleTokens = parseKeywordFilterTokens(
    interestedRole.replace(/[^a-z0-9+#. ]+/gi, " "),
  ).filter((token) => token.length > 2 && !ROLE_STOP_WORDS.has(token));

  if (roleTokens.length === 0) {
    return true;
  }

  const haystack = [job.role, job.company, job.jdText ?? ""].join(" ").toLowerCase();
  const matched = roleTokens.filter((token) => haystack.includes(token)).length;
  const required =
    roleTokens.length <= 2 ? 1 : Math.max(1, Math.ceil(roleTokens.length * 0.5));

  return matched >= required;
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

function normalizeJobDescription(text: string, max = 30000): string {
  const cleaned = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

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

export function isJobrightListing(
  source: string | null | undefined,
  jobUrl: string,
): boolean {
  const normalizedSource = (source ?? "").toLowerCase();
  if (normalizedSource.includes("jobright")) {
    return true;
  }

  const url = jobUrl.toLowerCase();
  if (url.includes("jobright")) {
    return true;
  }

  try {
    const host = new URL(jobUrl).hostname.toLowerCase();
    return host.includes("jobright");
  } catch {
    return false;
  }
}

const DEFAULT_POSTED_WITHIN_SECONDS = 7 * 24 * 60 * 60;

/** Time-window filter for a scrape (first scrape = 15 days, then since last run). */
export type JobPostedWithin = {
  seconds: number;
  days: number;
};

function buildLinkedInSearchUrl(
  position: string,
  location: string,
  postedWithinSeconds: number,
): string {
  const params = new URLSearchParams({
    keywords: position,
    location,
    f_TPR: `r${Math.max(3600, Math.floor(postedWithinSeconds))}`,
  });
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

/** Indeed's `fromage` filter only accepts these lookback values (days). */
const INDEED_FROMAGE_STEPS = [1, 3, 7, 14] as const;

function indeedFromageDays(days: number): number {
  for (const step of INDEED_FROMAGE_STEPS) {
    if (days <= step) {
      return step;
    }
  }
  return 14;
}

function buildIndeedSearchUrl(
  position: string,
  location: string,
  postedWithinDays: number,
): string {
  const params = new URLSearchParams({
    q: position,
    l: location,
    fromage: String(indeedFromageDays(postedWithinDays)),
    sort: "date",
  });
  return `https://www.indeed.com/jobs?${params.toString()}`;
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

function pickLongestDescription(...values: Array<string | null | undefined>): string {
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] ?? "";
}

function normalizeGlassdoorJob(raw: ApifyGlassdoorJob): JobListing | null {
  const role = raw.title?.trim();
  const jobUrl = raw.jobUrl?.trim();
  const company = raw.company?.trim() || "Unknown company";

  if (!role || !jobUrl || isJobrightListing(null, jobUrl)) {
    return null;
  }

  const description = [raw.description, raw.salary].filter(Boolean).join("\n\n");

  return {
    company,
    role,
    jobUrl: getCleanJobListingUrl(jobUrl, "glassdoor"),
    location: raw.location?.trim() || "United States",
    jdText: normalizeJobDescription(description),
    source: "glassdoor",
    postedAt: extractJobPostedDate(raw as Record<string, unknown>),
  };
}

function normalizeZipRecruiterJob(raw: ApifyZipRecruiterJob): JobListing | null {
  const role = raw.title?.trim();
  const jobUrl = raw.jobUrl?.trim();
  const company = raw.company?.trim() || "Unknown company";

  if (!role || !jobUrl || isJobrightListing(null, jobUrl)) {
    return null;
  }

  const description = pickLongestDescription(raw.description);

  return {
    company,
    role,
    jobUrl: getCleanJobListingUrl(jobUrl, "ziprecruiter"),
    location: raw.location?.trim() || "United States",
    jdText: normalizeJobDescription(description),
    source: "ziprecruiter",
    postedAt: extractJobPostedDate(raw as Record<string, unknown>),
  };
}

function normalizeIndeedJob(raw: ApifyIndeedJob): JobListing | null {
  const role = raw.positionName?.trim() || raw.title?.trim();
  const jobUrl = raw.url?.trim();
  const company = raw.company?.trim() || "Unknown company";

  if (!role || !jobUrl || isJobrightListing(null, jobUrl)) {
    return null;
  }

  const description = pickLongestDescription(
    raw.description,
    raw.descriptionHTML,
    raw.jobDescription,
  );

  return {
    company,
    role,
    jobUrl: getCleanJobListingUrl(jobUrl, "indeed"),
    location: raw.location?.trim() || "United States",
    jdText: normalizeJobDescription(description),
    source: "indeed",
    postedAt: extractJobPostedDate(raw as Record<string, unknown>),
  };
}

function normalizeLinkedInJob(raw: ApifyLinkedInJob): JobListing | null {
  const role = raw.title?.trim();
  const rawLink = raw.link?.trim();
  const company = raw.companyName?.trim() || "Unknown company";

  if (!role || !rawLink || isJobrightListing(null, rawLink)) {
    return null;
  }

  const jobUrl = getCleanJobListingUrl(rawLink, "linkedin");
  const applyUrl = resolveExternalApplyUrl(raw.applyUrl, jobUrl);
  const description = pickLongestDescription(
    raw.descriptionText,
    raw.description,
    raw.jobDescription,
  );

  return {
    company,
    role,
    jobUrl,
    applyUrl,
    location: raw.location?.trim() || "United States",
    jdText: normalizeJobDescription(description),
    source: "linkedin",
    postedAt: extractJobPostedDate(raw as Record<string, unknown>),
  };
}

function dedupeJobs(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  const unique: JobListing[] = [];

  for (const job of jobs) {
    if (isJobrightListing(job.source, job.jobUrl)) {
      continue;
    }
    if (seen.has(job.jobUrl)) {
      continue;
    }
    seen.add(job.jobUrl);
    unique.push(job);
  }

  return unique;
}

function filterRelevantJobs(jobs: JobListing[], searchPosition: string): JobListing[] {
  return jobs.filter(
    (job) =>
      !isJobrightListing(job.source, job.jobUrl) &&
      !isIrrelevantListing(job.role, searchPosition),
  );
}

export async function searchGlassdoorJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const maxItems = input.maxItems ?? 20;

  const result = await runApifyActor<ApifyGlassdoorJob>(
    APIFY_GLASSDOOR_ACTOR_ID,
    {
      query: input.position,
      location: input.location ?? "United States",
      maxResults: Math.max(10, maxItems),
    },
    240,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  const jobs = filterRelevantJobs(
    dedupeJobs(
      result.items
        .map((item) => normalizeGlassdoorJob(item))
        .filter((job): job is JobListing => job !== null),
    ),
    input.position,
  ).slice(0, maxItems);

  if (jobs.length === 0) {
    return { error: "Glassdoor returned no relevant jobs for this search." };
  }

  return { jobs };
}

export async function searchZipRecruiterJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const maxItems = input.maxItems ?? 20;

  const result = await runApifyActor<ApifyZipRecruiterJob>(
    APIFY_ZIPRECRUITER_ACTOR_ID,
    {
      search: input.position,
      location: input.location ?? "United States",
      maxPages: Math.min(20, Math.max(1, Math.ceil(maxItems / 20))),
    },
    240,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  const jobs = filterRelevantJobs(
    dedupeJobs(
      result.items
        .map((item) => normalizeZipRecruiterJob(item))
        .filter((job): job is JobListing => job !== null),
    ),
    input.position,
  ).slice(0, maxItems);

  if (jobs.length === 0) {
    return { error: "ZipRecruiter returned no relevant jobs for this search." };
  }

  return { jobs };
}

export async function searchIndeedJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
  postedWithin?: JobPostedWithin;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const postedWithinDays =
    input.postedWithin?.days ??
    Math.ceil(DEFAULT_POSTED_WITHIN_SECONDS / (24 * 60 * 60));
  const searchUrl = buildIndeedSearchUrl(
    input.position,
    input.location ?? "United States",
    postedWithinDays,
  );

  const result = await runApifyActor<ApifyIndeedJob>(APIFY_INDEED_ACTOR_ID, {
    country: "US",
    startUrls: [{ url: searchUrl }],
    ...(typeof input.maxItems === "number"
      ? {
          maxItemsPerSearch: input.maxItems,
          maxItems: input.maxItems,
        }
      : {}),
    saveOnlyUniqueItems: true,
    parseCompanyDetails: true,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  const filteredJobs = filterRelevantJobs(
    dedupeJobs(
      result.items
        .map((item) => normalizeIndeedJob(item))
        .filter((job): job is JobListing => job !== null),
    ),
    input.position,
  );
  const jobs =
    typeof input.maxItems === "number"
      ? filteredJobs.slice(0, input.maxItems)
      : filteredJobs;

  if (jobs.length === 0) {
    return { error: "Indeed returned no relevant jobs for this search." };
  }

  return { jobs };
}

export async function searchLinkedInJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
  postedWithin?: JobPostedWithin;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const location = input.location ?? "United States";
  const searchUrl = buildLinkedInSearchUrl(
    input.position,
    location,
    input.postedWithin?.seconds ?? DEFAULT_POSTED_WITHIN_SECONDS,
  );

  const result = await runApifyActor<ApifyLinkedInJob>(
    APIFY_LINKEDIN_ACTOR_ID,
    {
      urls: [searchUrl],
      ...(typeof input.maxItems === "number"
        ? { count: Math.max(10, input.maxItems) }
        : {}),
      scrapeCompany: true,
      splitByLocation: false,
    },
    240,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  const filteredJobs = filterRelevantJobs(
    dedupeJobs(
      result.items
        .map((item) => normalizeLinkedInJob(item))
        .filter((job): job is JobListing => job !== null),
    ),
    input.position,
  );
  const jobs =
    typeof input.maxItems === "number"
      ? filteredJobs.slice(0, input.maxItems)
      : filteredJobs;

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
  postedWithin?: JobPostedWithin;
  includeFortune500?: boolean;
}): Promise<{ jobs: JobListing[]; errors: string[] }> {
  const maxItems = input.maxItemsPerSource;
  const location = input.location ?? "United States";
  const requested = new Set(
    input.sources.filter((source) => JOB_MARKET_SOURCES.includes(source)),
  );
  const activeSources = JOB_MARKET_SOURCES.filter((source) => requested.has(source));
  const fortuneCompanies = input.includeFortune500
    ? await loadFortune500Companies()
    : [];
  const fortuneBatch = selectFortuneCompanyBatch(
    fortuneCompanies,
    `${input.position}:${Math.floor(Date.now() / (3 * 60 * 60 * 1000))}`,
  );

  const results = await Promise.all(
    activeSources.map(async (source) => {
      const search = (position: string) =>
        source === "linkedin"
          ? searchLinkedInJobs({
              position,
              location,
              maxItems,
              postedWithin: input.postedWithin,
            })
          : searchIndeedJobs({
              position,
              location,
              maxItems,
              postedWithin: input.postedWithin,
            });
      const basePromise = search(input.position);
      const fortunePromise = input.includeFortune500
        ? search(buildFortune500SearchPosition(input.position, fortuneBatch))
        : null;
      const [base, fortune] = await Promise.all([basePromise, fortunePromise]);
      const label = source === "linkedin" ? "LinkedIn" : "Indeed";
      const baseJobs = base && !("error" in base) ? base.jobs : [];
      const fortuneJobs =
        fortune && !("error" in fortune)
          ? fortune.jobs.filter((job) => hasFortuneCompanySignal(job, fortuneCompanies))
          : [];
      if (baseJobs.length === 0 && fortuneJobs.length === 0) {
        const error =
          (base && "error" in base ? base.error : null) ??
          (fortune && "error" in fortune ? fortune.error : null) ??
          "No relevant jobs were returned.";
        return { jobs: [] as JobListing[], error: `${label}: ${error}` };
      }
      return {
        jobs: dedupeJobs([...baseJobs, ...fortuneJobs]),
        error: null as string | null,
      };
    }),
  );

  const jobs: JobListing[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.error) {
      errors.push(result.error);
    } else {
      jobs.push(...result.jobs);
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

  if (source.includes("glassdoor") || url.includes("glassdoor.com")) {
    return "glassdoor";
  }
  if (source.includes("ziprecruiter") || url.includes("ziprecruiter.com")) {
    return "ziprecruiter";
  }
  if (source.includes("linkedin") || url.includes("linkedin.com")) {
    return "linkedin";
  }
  if (source.includes("indeed") || url.includes("indeed.com")) {
    return "indeed";
  }
  return "unknown";
}

/** Canonical job posting URL — strips LinkedIn tracking params and normalizes /jobs/view/{id}. */
export function getCleanJobListingUrl(
  jobUrl: string,
  sourceValue?: string | null,
): string {
  const trimmed = jobUrl.trim();
  if (!trimmed) {
    return trimmed;
  }

  const source = sourceValue ? resolveJobSource(sourceValue, trimmed) : resolveJobSource("", trimmed);

  if (source === "linkedin" || trimmed.includes("linkedin.com")) {
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname.replace(/\/apply\/?$/i, "");
      const viewMatch = pathname.match(/\/jobs\/view\/([^/]+)/i);
      if (viewMatch?.[1]) {
        const segment = decodeURIComponent(viewMatch[1]);
        const numericMatch = segment.match(/(\d{6,})$/);
        const id = numericMatch?.[1] ?? segment;
        return `https://www.linkedin.com/jobs/view/${id}/`;
      }
    } catch {
      return trimmed;
    }
  }

  if (source === "indeed" || trimmed.includes("indeed.com")) {
    try {
      const parsed = new URL(trimmed);
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/** Compact link label — LinkedIn job ID or hostname, not the full path. */
export function formatShortJobUrlLabel(
  jobUrl: string,
  sourceValue?: string | null,
): string {
  const url = getCleanJobListingUrl(jobUrl, sourceValue);
  if (!url.trim()) {
    return "Job";
  }

  const source = sourceValue
    ? resolveJobSource(sourceValue, url)
    : resolveJobSource("", url);

  try {
    const parsed = new URL(url);

    if (source === "linkedin" || parsed.hostname.includes("linkedin.com")) {
      const viewMatch = parsed.pathname.match(/\/jobs\/view\/([^/]+)/i);
      if (viewMatch?.[1]) {
        const segment = decodeURIComponent(viewMatch[1]);
        const numericMatch = segment.match(/(\d{6,})$/);
        if (numericMatch) {
          return `#${numericMatch[1]}`;
        }
        return segment.length > 20 ? `${segment.slice(0, 20)}…` : segment;
      }
      return "linkedin.com";
    }

    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return "Job";
  }
}

export function formatJobListingUrlLabel(
  jobUrl: string,
  sourceValue?: string | null,
): string {
  return formatShortJobUrlLabel(jobUrl, sourceValue);
}

/** Company apply URL from LinkedIn — excludes LinkedIn easy-apply links. */
export function resolveExternalApplyUrl(
  applyUrl: string | null | undefined,
  listingUrl: string,
): string | null {
  const trimmed = applyUrl?.trim();
  if (!trimmed) {
    return null;
  }

  const normalizedListing = getCleanJobListingUrl(listingUrl, "linkedin");
  const lower = trimmed.toLowerCase();

  if (lower.includes("linkedin.com")) {
    return null;
  }

  if (getCleanJobListingUrl(trimmed) === normalizedListing) {
    return null;
  }

  return trimmed;
}

function hostnameSourceLabel(jobUrl: string): string {
  try {
    const host = new URL(jobUrl).hostname.replace(/^www\./, "");
    if (isJobrightListing(null, jobUrl)) {
      return "Other";
    }
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

  if (normalized.includes("glassdoor") || url.includes("glassdoor.com")) {
    return "Glassdoor";
  }
  if (normalized.includes("ziprecruiter") || url.includes("ziprecruiter.com")) {
    return "ZipRecruiter";
  }
  if (normalized.includes("linkedin") || url.includes("linkedin.com")) {
    return "LinkedIn";
  }
  if (normalized.includes("indeed") || url.includes("indeed.com")) {
    return "Indeed";
  }
  if (normalized.includes("google")) {
    return "Google Jobs";
  }
  if (isJobrightListing(source, jobUrl ?? "")) {
    return "Other";
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
): Record<JobMarketSource | "other", number> {
  const counts: Record<JobMarketSource | "other", number> = {
    indeed: 0,
    linkedin: 0,
    glassdoor: 0,
    ziprecruiter: 0,
    other: 0,
  };

  for (const job of jobs) {
    const resolved = resolveJobSource(job.source, job.jobUrl);
    if (resolved === "unknown") {
      if (isUsaJobLocation(job.location)) {
        counts.other += 1;
      }
    } else {
      counts[resolved] += 1;
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
        "No jobs found on LinkedIn or Indeed.",
    };
  }

  return { jobs: result.jobs };
}
