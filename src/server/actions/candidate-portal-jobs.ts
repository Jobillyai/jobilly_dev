"use server";

import { getSessionUser } from "@/lib/auth/session";
import { isCandidateRole } from "@/lib/auth/roles";
import { formatExperienceYears } from "@/lib/format-experience-years";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import {
  getCandidateJobListings,
  type CandidateJobListing,
} from "@/server/services/candidate-jobs";
import { getCandidateEntitlements } from "@/server/services/candidate-subscriptions";

export type CandidatePortalJobsPayload = {
  jobs: CandidateJobListing[];
  targetRole: string;
  experienceYears: number | null;
  experienceLabel: string;
};

export async function loadMyMatchedJobsAction(): Promise<
  { error: string } | { success: true; data: CandidatePortalJobsPayload }
> {
  const user = await getSessionUser();
  if (!user || !isCandidateRole(user.role)) {
    return { error: "Unauthorized" };
  }

  const entitlements = await getCandidateEntitlements(user.id);
  if (!entitlements.hasManagedApplications) {
    return { error: "Managed Applications is not included in your plan." };
  }

  const candidate = await getAdminCandidateById(user.id);
  if (!candidate) {
    return { error: "Candidate profile not found" };
  }

  const targetRole = resolveCandidateJobRole(candidate) ?? "";
  const jobs = targetRole
    ? await getCandidateJobListings(user.id, targetRole)
    : [];

  return {
    success: true,
    data: {
      jobs,
      targetRole,
      experienceYears: candidate.experienceYears,
      experienceLabel: formatExperienceYears(candidate.experienceYears),
    },
  };
}
