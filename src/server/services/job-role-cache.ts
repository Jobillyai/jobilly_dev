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
