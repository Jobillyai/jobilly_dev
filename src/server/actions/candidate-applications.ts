"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { markAppliedJobsAsViewed } from "@/server/services/candidate-jobs";
import { createClient } from "@/server/db/supabase-server";
import { createSignedResumeUrl } from "@/server/services/resume-ats-check";

export async function markApplicationsViewedAction(): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Unauthorized" };
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
  if (!user) {
    return { error: "Unauthorized" };
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
    return { error: "No tailored resume attached for this application yet." };
  }

  const downloadUrl = await createSignedResumeUrl(data.application_resume_path);
  if (!downloadUrl) {
    return { error: "Could not open the tailored resume. Please try again." };
  }

  return {
    downloadUrl,
    fileName: data.application_resume_file_name,
  };
}
