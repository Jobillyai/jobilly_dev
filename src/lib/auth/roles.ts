export type UserRole =
  | "subscribed_candidate"
  | "free_candidate"
  | "employee"
  | "admin"
  | "manager"
  | "institution_admin"
  | "institution_candidate";

export type AdminPortalRole = "admin" | "manager";

export function isCandidateRole(role: string | null | undefined): boolean {
  return (
    role === "free_candidate" ||
    role === "subscribed_candidate" ||
    role === "institution_candidate"
  );
}

/** Mentor admins who apply on behalf of assigned candidates. */
export function isMentorAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Managers oversee mentors and service requests — no job scraping. */
export function isManagerRole(role: string | null | undefined): boolean {
  return role === "manager";
}

/** Can access the /admin portal (mentors + managers). */
export function isAdminPortalRole(role: string | null | undefined): boolean {
  return isMentorAdminRole(role) || isManagerRole(role);
}

/** @deprecated Use isAdminPortalRole — kept for minimal call-site churn. */
export function isAdminRole(role: string | null | undefined): boolean {
  return isAdminPortalRole(role);
}

/** Mentor admins scrape jobs for assigned candidates only (3-hour cache per role). */
export function canScrapeJobs(role: string | null | undefined): boolean {
  return isMentorAdminRole(role);
}
