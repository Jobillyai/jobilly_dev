import type { JobMarketSource } from "@/server/services/apify-job-search";

export const JOB_SCRAPE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function sourceScrapeHadError(
  source: JobMarketSource,
  errors: string[],
): boolean {
  const prefix = source === "indeed" ? "Indeed:" : "LinkedIn:";
  return errors.some((error) => error.startsWith(prefix));
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

export function normalizeSearchRole(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, " ");
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

export function describeCacheStatus(
  statuses: RoleScrapeCacheStatus[],
  requestedSources: JobMarketSource[],
): string {
  const freshSources = statuses
    .filter((entry) => entry.fresh && requestedSources.includes(entry.source))
    .map((entry) => entry.source);
  const scrapedSources = statuses
    .filter((entry) => !entry.fresh && requestedSources.includes(entry.source))
    .map((entry) => entry.source);

  if (freshSources.length === requestedSources.length) {
    return "Showing jobs cached in the last 24 hours — no Apify scrape needed.";
  }

  if (freshSources.length > 0 && scrapedSources.length > 0) {
    return `Used cached ${freshSources.join(" & ")} results; fresh Apify scrape for ${scrapedSources.join(" & ")}. New jobs were added to this role.`;
  }

  if (scrapedSources.length > 0) {
    return "Fresh Apify scrape — new unique jobs were added to this role.";
  }

  return "";
}
