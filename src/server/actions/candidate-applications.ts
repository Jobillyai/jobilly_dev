"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { isCandidateRole } from "@/lib/auth/roles";
import { markAppliedJobsAsViewed } from "@/server/services/candidate-jobs";
import { getCandidateEntitlements } from "@/server/services/candidate-subscriptions";
import { createClient } from "@/server/db/supabase-server";
import { createSignedResumeUrl } from "@/server/services/resume-storage";

export async function markApplicationsViewedAction(): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser();
  if (!user || !isCandidateRole(user.role)) {
    return { error: "Unauthorized" };
  }

  const entitlements = await getCandidateEntitlements(user.id);
  if (!entitlements.hasManagedApplications) {
    return { error: "Managed Applications is not included in your plan." };
  }

  await markAppliedJobsAsViewed(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");

  return { success: true };
}

export async function getApplicationResumeDownloadAction(jobId: string): Promise<
  | { downloadUrl: string; fileName: string | null }
  | { error: string }
> {
  const user = await getSessionUser();
  if (!user || !isCandidateRole(user.role)) {
    return { error: "Unauthorized" };
  }

  const entitlements = await getCandidateEntitlements(user.id);
  if (!entitlements.hasManagedApplications) {
    return { error: "Managed Applications is not included in your plan." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scraped_jobs")
    .select("application_resume_path, application_resume_file_name")
    .eq("id", jobId)
    .eq("candidate_id", user.id)
    .eq("applied", true)
    .maybeSingle();

  if (error || !data?.application_resume_path) {
    return { error: "No application resume is attached yet." };
  }

  const downloadUrl = await createSignedResumeUrl(data.application_resume_path);
  if (!downloadUrl) {
    return { error: "Could not open the application resume. Please try again." };
  }

  return {
    downloadUrl,
    fileName: data.application_resume_file_name,
  };
}
