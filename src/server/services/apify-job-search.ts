import { getApifyToken } from "@/server/services/apify-ats-score";

const APIFY_INDEED_ACTOR_ID = "misceres~indeed-scraper";
const APIFY_LINKEDIN_ACTOR_ID = "curious_coder~linkedin-jobs-scraper";

export type JobMarketSource = "indeed" | "linkedin";

export type ApifyJobListing = {
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string;
  source: JobMarketSource;
};

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
    "software engineer intern";

  return {
    position,
    location: "United States",
  };
}

function truncate(text: string, max = 220): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1)}…`;
}

function buildLinkedInSearchUrl(position: string, location: string): string {
  const params = new URLSearchParams({
    keywords: position,
    location,
    f_TPR: "r604800",
  });
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

function normalizeIndeedJob(raw: ApifyIndeedJob): ApifyJobListing | null {
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

function normalizeLinkedInJob(raw: ApifyLinkedInJob): ApifyJobListing | null {
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

async function runApifyActor<T>(
  actorId: string,
  body: Record<string, unknown>,
  timeoutSeconds = 180,
): Promise<{ items: T[] } | { error: string }> {
  const token = getApifyToken();

  if (!token) {
    return {
      error: "Add APIFY_API_TOKEN or APIFY_KEY to search jobs with Apify.",
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

export async function searchIndeedJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: ApifyJobListing[] } | { error: string }> {
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

  const jobs = dedupeJobs(
    result.items
      .map((item) => normalizeIndeedJob(item))
      .filter((job): job is ApifyJobListing => job !== null),
  );

  if (jobs.length === 0) {
    return { error: "Indeed returned no jobs for this search." };
  }

  return { jobs };
}

export async function searchLinkedInJobs(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: ApifyJobListing[] } | { error: string }> {
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

  const jobs = dedupeJobs(
    result.items
      .map((item) => normalizeLinkedInJob(item))
      .filter((job): job is ApifyJobListing => job !== null),
  );

  if (jobs.length === 0) {
    return { error: "LinkedIn returned no jobs for this search." };
  }

  return { jobs };
}

function dedupeJobs(jobs: ApifyJobListing[]): ApifyJobListing[] {
  const seen = new Set<string>();
  const unique: ApifyJobListing[] = [];

  for (const job of jobs) {
    if (seen.has(job.jobUrl)) {
      continue;
    }
    seen.add(job.jobUrl);
    unique.push(job);
  }

  return unique;
}

export async function searchJobsBySources(input: {
  position: string;
  location?: string;
  sources: JobMarketSource[];
  maxItemsPerSource?: number;
}): Promise<{ jobs: ApifyJobListing[]; errors: string[] }> {
  const jobs: ApifyJobListing[] = [];
  const errors: string[] = [];
  const maxItems = input.maxItemsPerSource ?? 20;

  if (input.sources.includes("indeed")) {
    const indeed = await searchIndeedJobs({
      position: input.position,
      location: input.location,
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
      location: input.location,
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

export function formatJobSourceLabel(
  source: JobMarketSource | string,
  jobUrl?: string,
): string {
  const resolved = jobUrl ? resolveJobSource(source, jobUrl) : null;

  if (resolved === "linkedin" || source.toLowerCase().includes("linkedin")) {
    return "LinkedIn";
  }
  if (resolved === "indeed" || source.toLowerCase().includes("indeed")) {
    return "Indeed";
  }
  return "Apify";
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

  return sourceValue.toLowerCase().includes(filter);
}

// Backward-compatible alias used by ATS module naming elsewhere.
export const buildIndeedSearchFromInterests = buildJobSearchFromInterests;

export async function searchJobsWithApify(input: {
  position: string;
  location?: string;
  maxItems?: number;
}): Promise<{ jobs: ApifyJobListing[] } | { error: string }> {
  const result = await searchJobsBySources({
    position: input.position,
    location: input.location,
    sources: ["indeed", "linkedin"],
    maxItemsPerSource: Math.ceil((input.maxItems ?? 30) / 2),
  });

  if (result.jobs.length === 0) {
    return {
      error: result.errors.join(" ") || "No jobs found on Indeed or LinkedIn.",
    };
  }

  return { jobs: result.jobs };
}
