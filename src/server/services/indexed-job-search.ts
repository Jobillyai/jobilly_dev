import type {
  JobListing,
  JobMarketSource,
  JobPostedWithin,
} from "@/server/services/job-market-search";
import {
  dedupeJobs,
  filterRelevantJobs,
  isUsaJobLocation,
  resolveJobSource,
} from "@/server/services/job-market-search";
import { extractJobPostedDate } from "@/lib/job-posted-date";

type JSearchJob = {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_publisher?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_description?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_posted_at_datetime_utc?: string;
  job_posted_at_timestamp?: number;
  job_posted_at?: string;
};

type JSearchResponse = {
  status?: string;
  data?: JSearchJob[];
  message?: string;
  error?: string;
};

function getJsearchApiKey(): string | null {
  const key =
    process.env.JSEARCH_API_KEY?.trim() ||
    process.env.RAPIDAPI_KEY?.trim() ||
    process.env.RAPID_API_KEY?.trim() ||
    "";
  return key || null;
}

/** True when an indexed jobs API key is configured. */
export function hasIndexedJobApi(): boolean {
  return Boolean(getJsearchApiKey() || process.env.SERPAPI_API_KEY?.trim());
}

function datePostedParam(postedWithin?: JobPostedWithin): string {
  if (!postedWithin) {
    return "week";
  }
  const days = postedWithin.days;
  if (days <= 1) return "today";
  if (days <= 3) return "3days";
  if (days <= 7) return "week";
  return "month";
}

function buildLocationLabel(job: JSearchJob): string {
  if (job.job_is_remote) {
    return "Remote, United States";
  }
  const parts = [job.job_city, job.job_state, job.job_country || "United States"]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "United States";
}

function mapPublisherToSource(
  publisher: string | undefined,
  url: string,
): JobMarketSource | null {
  const resolved = resolveJobSource(publisher, url);
  if (resolved === "unknown") {
    // Keep company-career / Google Jobs links in the Indeed bucket for filters.
    return "indeed";
  }
  return resolved;
}

function normalizeJSearchJob(job: JSearchJob): JobListing | null {
  const role = job.job_title?.trim();
  const company = job.employer_name?.trim();
  const jobUrl = (job.job_apply_link || job.job_google_link || "").trim();
  if (!role || !company || !jobUrl) {
    return null;
  }

  const source = mapPublisherToSource(job.job_publisher, jobUrl);
  if (!source) {
    return null;
  }

  const location = buildLocationLabel(job);
  if (!isUsaJobLocation(location)) {
    return null;
  }

  const postedAt = extractJobPostedDate({
    postedAt: job.job_posted_at_datetime_utc,
    postedAtTimestamp: job.job_posted_at_timestamp,
    postedDate: job.job_posted_at,
  });

  return {
    company,
    role,
    jobUrl,
    applyUrl: job.job_apply_link?.trim() || jobUrl,
    location,
    jdText: (job.job_description ?? "").trim() || `${role} at ${company}`,
    source,
    postedAt,
  };
}

/**
 * Indexed job search via JSearch (RapidAPI) — typically returns in a few seconds.
 * https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 */
export async function searchJobsWithJSearch(input: {
  position: string;
  location?: string;
  sources: JobMarketSource[];
  maxItems?: number;
  postedWithin?: JobPostedWithin;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const apiKey = getJsearchApiKey();
  if (!apiKey) {
    return { error: "Add JSEARCH_API_KEY or RAPIDAPI_KEY for indexed job search." };
  }

  const location = input.location?.trim() || "United States";
  const maxItems = Math.max(10, Math.min(input.maxItems ?? 40, 50));
  const numPages = Math.min(5, Math.max(1, Math.ceil(maxItems / 10)));
  const query = `${input.position} jobs in ${location}`;

  const params = new URLSearchParams({
    query,
    page: "1",
    num_pages: String(numPages),
    country: "us",
    date_posted: datePostedParam(input.postedWithin),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    const body = (await response.json().catch(() => ({}))) as JSearchResponse;

    if (!response.ok) {
      return {
        error:
          body.message ||
          body.error ||
          `JSearch failed (${response.status}). Check RAPIDAPI_KEY / plan limits.`,
      };
    }

    const requested = new Set(input.sources);
    const mapped = (body.data ?? [])
      .map((item) => normalizeJSearchJob(item))
      .filter((job): job is JobListing => job !== null)
      .filter((job) => requested.has(job.source) || requested.size === 0);

    const jobs =
      mapped.length > 0
        ? mapped
        : (body.data ?? [])
            .map((item) => normalizeJSearchJob(item))
            .filter((job): job is JobListing => job !== null);

    const filtered = filterRelevantJobs(dedupeJobs(jobs), input.position).slice(
      0,
      maxItems,
    );

    if (filtered.length === 0) {
      return { error: "JSearch returned no relevant US jobs for this search." };
    }

    return { jobs: filtered };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "JSearch timed out after 12 seconds." };
    }
    return {
      error: error instanceof Error ? error.message : "JSearch request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

type SerpApiJob = {
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  share_link?: string;
  apply_link?: string;
  apply_options?: Array<{ link?: string }>;
  detected_extensions?: { posted_at?: string };
};

/**
 * Optional SerpAPI Google Jobs fallback when JSearch key is missing.
 * https://serpapi.com/google-jobs-api
 */
export async function searchJobsWithSerpApi(input: {
  position: string;
  location?: string;
  sources: JobMarketSource[];
  maxItems?: number;
}): Promise<{ jobs: JobListing[] } | { error: string }> {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey) {
    return { error: "Add SERPAPI_API_KEY for Google Jobs indexed search." };
  }

  const location = input.location?.trim() || "United States";
  const params = new URLSearchParams({
    engine: "google_jobs",
    q: `${input.position} ${location}`,
    location: "United States",
    hl: "en",
    gl: "us",
    api_key: apiKey,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      jobs_results?: SerpApiJob[];
    };

    if (!response.ok || body.error) {
      return { error: body.error || `SerpAPI failed (${response.status}).` };
    }

    const jobs = (body.jobs_results ?? [])
      .map((item): JobListing | null => {
        const role = item.title?.trim();
        const company = item.company_name?.trim();
        const jobUrl =
          item.apply_options?.[0]?.link?.trim() ||
          item.apply_link?.trim() ||
          item.share_link?.trim() ||
          "";
        if (!role || !company || !jobUrl) return null;
        const source = mapPublisherToSource(undefined, jobUrl) ?? "indeed";
        const loc = item.location?.trim() || "United States";
        if (!isUsaJobLocation(loc)) return null;
        return {
          company,
          role,
          jobUrl,
          applyUrl: jobUrl,
          location: loc,
          jdText: (item.description ?? "").trim() || `${role} at ${company}`,
          source,
          postedAt: extractJobPostedDate({
            postedAt: item.detected_extensions?.posted_at,
          }),
        };
      })
      .filter((job): job is JobListing => job !== null);

    const filtered = filterRelevantJobs(dedupeJobs(jobs), input.position).slice(
      0,
      input.maxItems ?? 40,
    );

    if (filtered.length === 0) {
      return { error: "SerpAPI returned no relevant jobs." };
    }

    return { jobs: filtered };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "SerpAPI timed out after 12 seconds." };
    }
    return {
      error: error instanceof Error ? error.message : "SerpAPI request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Prefer JSearch, then SerpAPI. */
export async function searchIndexedJobs(input: {
  position: string;
  location?: string;
  sources: JobMarketSource[];
  maxItems?: number;
  postedWithin?: JobPostedWithin;
}): Promise<{ jobs: JobListing[]; provider: "jsearch" | "serpapi" } | { error: string }> {
  if (getJsearchApiKey()) {
    const result = await searchJobsWithJSearch(input);
    if (!("error" in result)) {
      return { jobs: result.jobs, provider: "jsearch" };
    }
    if (!process.env.SERPAPI_API_KEY?.trim()) {
      return result;
    }
  }

  if (process.env.SERPAPI_API_KEY?.trim()) {
    const result = await searchJobsWithSerpApi(input);
    if ("error" in result) {
      return result;
    }
    return { jobs: result.jobs, provider: "serpapi" };
  }

  return {
    error:
      "No indexed job API configured. Add JSEARCH_API_KEY (RapidAPI) or SERPAPI_API_KEY.",
  };
}
