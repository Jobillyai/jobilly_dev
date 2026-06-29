import type { AdminCandidate } from "@/server/services/admin-dashboard";
import { buildCandidateJobSearchQuery } from "@/server/services/candidate-job-search";

/** Role used when scraping or listing jobs for a candidate. */
export function resolveCandidateJobRole(candidate: AdminCandidate): string | null {
  const managerRole = candidate.jobSearchRole?.trim();
  if (managerRole) {
    return managerRole;
  }

  const advisoryRole = candidate.submission?.interestedTechnology?.trim();
  if (advisoryRole) {
    return advisoryRole;
  }

  const profileSearchQuery = buildCandidateJobSearchQuery(candidate);
  return profileSearchQuery.position || null;
}
