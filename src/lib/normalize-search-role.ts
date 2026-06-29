/** Normalized role key used for scraped_jobs.search_role and cache lookups. */
export function normalizeSearchRole(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, " ");
}
