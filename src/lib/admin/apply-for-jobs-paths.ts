import type { Route } from "next";

export const ADMIN_APPLY_FOR_JOBS_HREF = "/admin/apply_for_jobs/jobs" as const satisfies Route;

/** Standalone resume_dashboard.html opened in a new tab from job Links. */
export const RESUME_TAILOR_EXTERNAL_URL = "/resume_dashboard.html?v=ats-first-2";

export function adminApplyForJobsCandidatePath(candidateId: string): Route {
  return `/admin/apply_for_jobs/jobs/${candidateId}` as Route;
}

export function adminApplyForJobsAppliedPath(candidateId: string): Route {
  return `/admin/apply_for_jobs/jobs/${candidateId}/applied` as Route;
}

export function revalidateApplyForJobsPaths(candidateId: string): string[] {
  return [
    ADMIN_APPLY_FOR_JOBS_HREF,
    adminApplyForJobsCandidatePath(candidateId),
    adminApplyForJobsAppliedPath(candidateId),
  ];
}

export function revalidateApplyForJobsCandidatePages(
  revalidatePath: (path: string) => void,
  candidateId: string,
): void {
  for (const path of revalidateApplyForJobsPaths(candidateId)) {
    revalidatePath(path);
  }
}
