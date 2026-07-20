import type { JobMarketSource } from "@/server/services/job-market-search";
import { normalizeSearchRole as normalizeSearchRoleFromLib } from "@/lib/normalize-search-role";

export { normalizeSearchRoleFromLib as normalizeSearchRole };

export const JOB_SCRAPE_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

const SOURCE_ERROR_PREFIX: Record<JobMarketSource, string> = {
  indeed: "Indeed:",
  linkedin: "LinkedIn:",
  glassdoor: "Glassdoor:",
  ziprecruiter: "ZipRecruiter:",
};

export function sourceScrapeHadError(
  source: JobMarketSource,
  errors: string[],
): boolean {
  return errors.some((error) => error.startsWith(SOURCE_ERROR_PREFIX[source]));
}

export const LEGACY_SEARCH_ROLE = "general";

export function formatSearchRoleLabel(searchRole: string): string {
  if (searchRole === LEGACY_SEARCH_ROLE) {
    return "Legacy (general)";
  }

  return searchRole
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isScrapeCacheFresh(lastScrapedAt: string | null | undefined): boolean {
  if (!lastScrapedAt) {
    return false;
  }

  const scrapedAt = new Date(lastScrapedAt).getTime();
  if (Number.isNaN(scrapedAt)) {
    return false;
  }

  return Date.now() - scrapedAt < JOB_SCRAPE_CACHE_TTL_MS;
}

export function cacheExpiresAt(lastScrapedAt: string): string {
  return new Date(
    new Date(lastScrapedAt).getTime() + JOB_SCRAPE_CACHE_TTL_MS,
  ).toISOString();
}

export type JobFreshnessFilter =
  | "all"
  | "last_24h"
  | "last_3d"
  | "last_7d"
  | "older";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** First scrape for a candidate+role looks back this many days. */
export const FIRST_SCRAPE_WINDOW_DAYS = 7;
const MAX_SCRAPE_WINDOW_MS = FIRST_SCRAPE_WINDOW_DAYS * DAY_MS;
/**
 * Overlap added to incremental windows so listings posted right around the
 * previous scrape aren't missed — URL-level dedupe drops any repeats.
 */
const SCRAPE_WINDOW_OVERLAP_MS = HOUR_MS;

export type ScrapeWindow = {
  isFirstScrape: boolean;
  windowMs: number;
  /** Window as whole seconds — LinkedIn `f_TPR=r{seconds}` filter. */
  seconds: number;
  /** Window as whole days (1–7) — Indeed `fromage={days}` filter. */
  days: number;
};

/**
 * How far back a scrape should look for new postings.
 *
 * - No successful scrape yet → the full first-scrape window (7 days).
 * - Otherwise → time since the last successful scrape plus a small overlap,
 *   capped at 7 days. This naturally covers logout→login gaps, overnight
 *   idle time, and weekends: the next scrape simply spans everything since
 *   the last successful one, so no posting window is skipped.
 */
export function resolveScrapeWindow(
  lastScrapedAt: string | null | undefined,
  now: number = Date.now(),
): ScrapeWindow {
  const lastMs = lastScrapedAt ? new Date(lastScrapedAt).getTime() : Number.NaN;

  if (Number.isNaN(lastMs)) {
    return {
      isFirstScrape: true,
      windowMs: MAX_SCRAPE_WINDOW_MS,
      seconds: Math.ceil(MAX_SCRAPE_WINDOW_MS / 1000),
      days: FIRST_SCRAPE_WINDOW_DAYS,
    };
  }

  const elapsedMs = Math.max(0, now - lastMs);
  const windowMs = Math.min(elapsedMs + SCRAPE_WINDOW_OVERLAP_MS, MAX_SCRAPE_WINDOW_MS);

  return {
    isFirstScrape: false,
    windowMs,
    seconds: Math.ceil(windowMs / 1000),
    days: Math.min(FIRST_SCRAPE_WINDOW_DAYS, Math.max(1, Math.ceil(windowMs / DAY_MS))),
  };
}

export function describeScrapeWindow(window: ScrapeWindow): string {
  if (window.isFirstScrape) {
    return `First search for this role — scanning jobs posted in the last ${FIRST_SCRAPE_WINDOW_DAYS} days.`;
  }

  const hours = Math.max(1, Math.round(window.windowMs / HOUR_MS));
  if (hours < 48) {
    return `Scanning jobs posted in the last ${hours} hour${hours === 1 ? "" : "s"} (since the previous search).`;
  }

  const days = Math.ceil(hours / 24);
  return `Scanning jobs posted in the last ${days} days (since the previous search).`;
}

export function jobMatchesFreshnessFilter(
  postedAt: string | null | undefined,
  filter: JobFreshnessFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (!postedAt) {
    return false;
  }

  const postedMs = new Date(postedAt).getTime();
  if (Number.isNaN(postedMs)) {
    return false;
  }

  const ageMs = Date.now() - postedMs;
  if (ageMs < 0) {
    return false;
  }

  switch (filter) {
    case "last_24h":
      return ageMs < DAY_MS;
    case "last_3d":
      return ageMs < 3 * DAY_MS;
    case "last_7d":
      return ageMs < 7 * DAY_MS;
    case "older":
      return ageMs >= 7 * DAY_MS;
    default:
      return true;
  }
}

export function formatJobFreshnessLabel(postedAt: string | null | undefined): string {
  if (!postedAt) {
    return "Unknown";
  }

  const postedMs = new Date(postedAt).getTime();
  if (Number.isNaN(postedMs)) {
    return "Unknown";
  }

  const ageMs = Date.now() - postedMs;
  if (ageMs < 0) {
    return "Unknown";
  }

  if (ageMs < DAY_MS) {
    return "Today";
  }
  if (ageMs < 3 * DAY_MS) {
    return "< 3d";
  }
  if (ageMs < 7 * DAY_MS) {
    return "< 7d";
  }
  if (ageMs < 30 * DAY_MS) {
    return "< 30d";
  }
  return "Older";
}

export function countJobsMatchingFreshnessFilter(
  jobs: Array<{ postedAt: string | null }>,
  filter: JobFreshnessFilter,
): number {
  return jobs.filter((job) => jobMatchesFreshnessFilter(job.postedAt, filter)).length;
}

export type RoleScrapeCacheStatus = {
  source: JobMarketSource;
  lastScrapedAt: string | null;
  fresh: boolean;
};

function formatSourceLabel(source: JobMarketSource): string {
  if (source === "ziprecruiter") {
    return "ZipRecruiter";
  }
  if (source === "linkedin") {
    return "LinkedIn";
  }
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function describeCacheStatus(
  statuses: RoleScrapeCacheStatus[],
  requestedSources: JobMarketSource[],
): string {
  const freshSources = statuses
    .filter((entry) => entry.fresh && requestedSources.includes(entry.source))
    .map((entry) => formatSourceLabel(entry.source));
  const scrapedSources = statuses
    .filter((entry) => !entry.fresh && requestedSources.includes(entry.source))
    .map((entry) => formatSourceLabel(entry.source));

  if (freshSources.length === requestedSources.length) {
    return "Showing all stored jobs for this role — after 3 hours, a new search appends fresh listings.";
  }

  if (freshSources.length > 0 && scrapedSources.length > 0) {
    return `Used cached ${freshSources.join(" & ")} results; appended new jobs from ${scrapedSources.join(" & ")} to this role.`;
  }

  if (scrapedSources.length > 0) {
    return `Fresh scrape — new unique jobs were appended to stored jobs for this role from ${scrapedSources.join(" & ")}.`;
  }

  return "";
}
