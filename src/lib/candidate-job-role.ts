import { composeJobSearchPosition } from "@/lib/job-search-position";

/** Minimal candidate shape needed to resolve a scrape/display target role. */
export type CandidateJobRoleSource = {
  jobSearchRole?: string | null;
  experienceYears?: number | null;
  specialization?: string | null;
  careerGoals?: string | null;
  profileEducation?: string | null;
  submission?: {
    interestedTechnology?: string | null;
    branch?: string | null;
    graduationDetails?: string | null;
  } | null;
};

/** Role used when scraping or listing jobs for a candidate. */
export function resolveCandidateJobRole(candidate: CandidateJobRoleSource): string | null {
  const managerRole = candidate.jobSearchRole?.trim();
  if (managerRole) {
    return managerRole;
  }

  const advisoryRole = candidate.submission?.interestedTechnology?.trim();
  if (advisoryRole) {
    return advisoryRole;
  }

  const position = composeJobSearchPosition({
    interestedRole: null,
    interestedTechnology: candidate.submission?.interestedTechnology,
    branch: candidate.submission?.branch,
    graduationDetails: candidate.submission?.graduationDetails,
    careerGoals: candidate.careerGoals,
    specialization: candidate.specialization,
    profileEducation: candidate.profileEducation,
    experienceYears: candidate.experienceYears,
  });

  return position || null;
}
