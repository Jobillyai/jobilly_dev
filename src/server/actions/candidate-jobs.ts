"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/admin";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import {
  refreshCandidateJobListings,
  setCandidateJobSelected,
} from "@/server/services/candidate-jobs";

export async function refreshCandidateJobsAction(candidateId: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const candidate = await getAdminCandidateById(candidateId);
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const { jobs, searchTerms } = await refreshCandidateJobListings(
    candidate,
    admin.id,
  );

  revalidatePath(`/admin/candidates/${candidateId}/jobs`);

  return {
    success: true,
    count: jobs.length,
    searchTerms,
  };
}

export async function toggleCandidateJobSelectedAction(
  candidateId: string,
  jobId: string,
  selected: boolean,
) {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const ok = await setCandidateJobSelected(jobId, selected);
  if (!ok) {
    return { error: "Could not update job selection" };
  }

  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  return { success: true };
}
