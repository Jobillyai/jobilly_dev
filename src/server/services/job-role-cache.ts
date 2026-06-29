import type { JobMarketSource } from "@/server/services/job-market-search";
import { normalizeSearchRole as normalizeSearchRoleFromLib } from "@/lib/normalize-search-role";

export { normalizeSearchRoleFromLib as normalizeSearchRole };

export const JOB_SCRAPE_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

const SOURCE_ERROR_PREFIX: Record<JobMarketSource, string> = {
  indeed: "Indeed:",
  linkedin: "LinkedIn:",
  google_jobs: "Google Jobs:",
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

export type RoleScrapeCacheStatus = {
  source: JobMarketSource;
  lastScrapedAt: string | null;
  fresh: boolean;
};

function formatSourceLabel(source: JobMarketSource): string {
  if (source === "google_jobs") {
    return "Google Jobs";
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
    return "Showing jobs cached in the last 3 hours — no new scrape needed.";
  }

  if (freshSources.length > 0 && scrapedSources.length > 0) {
    return `Used cached ${freshSources.join(" & ")} results; fresh scrape for ${scrapedSources.join(" & ")}. New jobs were added to this role.`;
  }

  if (scrapedSources.length > 0) {
    return `Fresh scrape — new unique jobs were added from ${scrapedSources.join(" & ")}.`;
  }

  return "";
}
