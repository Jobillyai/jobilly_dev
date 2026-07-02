"use server";

import { revalidatePath } from "next/cache";
import {
  getAdminUser,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import { parseExperienceYears } from "@/lib/format-experience-years";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import {
  scrapeSingleCandidateJobs,
  updateCandidateJobSearchRole,
  updateCandidateExperienceYears,
  type BulkJobScrapeResult,
  type BulkScrapeCandidateResult,
} from "@/server/services/bulk-job-scrape";
import {
  JOB_MARKET_SOURCES,
  type JobMarketSource,
} from "@/server/services/job-market-search";
import {
  getCandidatePreviousSearches,
  getCandidateAppliedJobListings,
  loadCandidateJobsForRole,
  loadCandidateJobsForStoredRole,
  refreshCandidateJobListings,
  setAppliedJobResume,
  setCandidateJobApplied,
  setCandidateJobSelected,
  type CandidateJobListing,
  type JobListingViewMode,
  type PreviousSearchRole,
} from "@/server/services/candidate-jobs";
import type { RoleScrapeCacheStatus } from "@/server/services/job-role-cache";
import {
  createSignedResumeUrl,
  saveApplicationResumeFile,
} from "@/server/services/resume-ats-check";
import { RESUME_MIME_TYPES } from "@/server/services/apify-ats-score";

export type JobSearchSourceMode = JobMarketSource | "all";

function sourcesFromMode(mode: JobSearchSourceMode): JobMarketSource[] {
  if (mode === "all") {
    return [...JOB_MARKET_SOURCES];
  }
  return [mode];
}

type JobSearchSuccess = {
  success: true;
  count: number;
  jobs: CandidateJobListing[];
  searchTerms: string[];
  searchQuery: string;
  searchRole: string;
  cacheStatus: RoleScrapeCacheStatus[];
  scrapeCalled: boolean;
  newJobsAdded: number;
  info?: string;
  warning?: string;
};

export async function listCandidatePreviousSearchesAction(
  candidateId: string,
): Promise<
  | { error: string }
  | { success: true; searches: PreviousSearchRole[] }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const searches = await getCandidatePreviousSearches(candidateId);
  return { success: true, searches };
}

export async function loadPreviousSearchJobsAction(
  candidateId: string,
  storedSearchRole: string,
  viewMode: JobListingViewMode = "pipeline",
): Promise<
  | { error: string }
  | {
      success: true;
      jobs: CandidateJobListing[];
      searchRole: string;
      label: string;
      cacheStatus: RoleScrapeCacheStatus[];
    }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  if (!storedSearchRole.trim()) {
    return { error: "Select a previous search to load." };
  }

  const result = await loadCandidateJobsForStoredRole(
    candidateId,
    storedSearchRole,
    viewMode,
  );

  return {
    success: true,
    jobs: result.jobs,
    searchRole: result.searchRole,
    label: result.label,
    cacheStatus: result.cacheStatus,
  };
}

export async function loadCandidateJobsForRoleAction(
  candidateId: string,
  interestedRole: string,
  viewMode: JobListingViewMode = "pipeline",
): Promise<
  | { error: string }
  | {
      success: true;
      jobs: CandidateJobListing[];
      searchRole: string;
      cacheStatus: RoleScrapeCacheStatus[];
    }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const role = interestedRole.trim();
  if (!role) {
    return { error: "Enter an interested role to view stored jobs." };
  }

  const result = await loadCandidateJobsForRole(candidateId, role, viewMode);
  return {
    success: true,
    jobs: result.jobs,
    searchRole: result.searchRole,
    cacheStatus: result.cacheStatus,
  };
}

export async function loadCandidateAppliedJobsAction(
  candidateId: string,
  interestedRole?: string,
): Promise<
  | { error: string }
  | {
      success: true;
      jobs: CandidateJobListing[];
    }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const role = interestedRole?.trim() || null;
  const jobs = await getCandidateAppliedJobListings(candidateId, role);

  return { success: true, jobs };
}

export async function refreshCandidateJobsAction(
  candidateId: string,
  sourceMode: JobSearchSourceMode = "all",
  interestedRole?: string,
  experienceYearsInput?: string | number | null,
  searchKeywords?: string | null,
): Promise<{ error: string } | JobSearchSuccess> {
  const sources = sourcesFromMode(sourceMode);
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const staff = toStaffContext(admin);
  let candidate = await getAdminCandidateById(candidateId, staff);
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const role = interestedRole?.trim();
  const canScrape = staffCanScrapeJobs(staff);

  if (canScrape) {
    if (role) {
      const saveRole = await updateCandidateJobSearchRole(candidateId, role);
      if (saveRole.error) {
        return { error: saveRole.error };
      }
    }

    if (experienceYearsInput !== undefined) {
      const experienceYears =
        typeof experienceYearsInput === "number"
          ? experienceYearsInput
          : parseExperienceYears(experienceYearsInput);
      const saveExperience = await updateCandidateExperienceYears(
        candidateId,
        experienceYears,
      );
      if (saveExperience.error) {
        return { error: saveExperience.error };
      }
    }

    const refreshed = await getAdminCandidateById(candidateId, staff);
    if (refreshed) {
      candidate = refreshed;
    }
  }

  const result = await refreshCandidateJobListings(
    candidate,
    admin.id,
    sources,
    role || undefined,
    {
      allowScrape: canScrape,
      forceScrape: false,
      searchKeywords: searchKeywords?.trim() || null,
    },
  );

  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  revalidatePath(`/admin/candidates/${candidateId}/jobs/applied`);
  revalidatePath("/admin/jobs");
  revalidatePath("/dashboard/jobs");

  if (result.error && result.jobs.length === 0) {
    return { error: result.error };
  }

  return {
    success: true,
    count: result.jobs.length,
    jobs: result.jobs,
    searchTerms: result.searchTerms,
    searchQuery: result.searchQuery,
    searchRole: result.searchRole,
    cacheStatus: result.cacheStatus,
    scrapeCalled: result.scrapeCalled,
    newJobsAdded: result.newJobsAdded,
    info: result.info,
    warning: result.warning ?? result.error,
  };
}

export async function updateCandidateJobRoleAction(
  candidateId: string,
  jobSearchRole: string,
): Promise<{ error: string } | { success: true }> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  if (!staffCanScrapeJobs(toStaffContext(admin))) {
    return { error: "Only assigned admins can edit candidate job roles." };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const result = await updateCandidateJobSearchRole(candidateId, jobSearchRole);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/candidates/${candidateId}/jobs`);

  return { success: true };
}

export async function updateCandidateExperienceYearsAction(
  candidateId: string,
  experienceYears: number | null,
): Promise<{ error: string } | { success: true }> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  if (!staffCanScrapeJobs(toStaffContext(admin))) {
    return { error: "Only assigned admins can edit candidate experience." };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const result = await updateCandidateExperienceYears(candidateId, experienceYears);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  revalidatePath("/dashboard/jobs");

  return { success: true };
}

export async function scrapeSingleCandidateJobsAction(
  candidateId: string,
  interestedRole?: string,
  experienceYearsInput?: string | number | null,
): Promise<{ error: string } | { success: true; result: BulkScrapeCandidateResult }> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  if (!staffCanScrapeJobs(toStaffContext(admin))) {
    return { error: "Only assigned admins can run job searches." };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const role = interestedRole?.trim();
  if (role) {
    const saveResult = await updateCandidateJobSearchRole(candidateId, role);
    if (saveResult.error) {
      return { error: saveResult.error };
    }
  }

  const experienceYears =
    experienceYearsInput === undefined
      ? candidate.experienceYears
      : typeof experienceYearsInput === "number"
        ? experienceYearsInput
        : parseExperienceYears(experienceYearsInput);

  if (experienceYearsInput !== undefined) {
    const saveExperience = await updateCandidateExperienceYears(
      candidateId,
      experienceYears,
    );
    if (saveExperience.error) {
      return { error: saveExperience.error };
    }
  }

  const result = await scrapeSingleCandidateJobs(
    {
      ...candidate,
      jobSearchRole: role ?? candidate.jobSearchRole,
      experienceYears: experienceYears ?? candidate.experienceYears,
    },
    admin.id,
    role,
  );

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  revalidatePath("/dashboard/jobs");

  if (result.error && !result.scrapeCalled && result.newJobsAdded === 0) {
    return { error: result.error };
  }

  return { success: true, result };
}

export async function scrapeAllCandidatesJobsAction(): Promise<
  { error: string } | { success: true; result: BulkJobScrapeResult }
> {
  return {
    error:
      "Bulk scraping is disabled to control billing. Search jobs from each assigned candidate's job sheet (once every 3 hours per role).",
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

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const ok = await setCandidateJobSelected(jobId, candidateId, selected);
  if (!ok) {
    return { error: "Could not update job selection" };
  }

  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  return { success: true };
}

export async function toggleCandidateJobAppliedAction(
  candidateId: string,
  jobId: string,
  applied: boolean,
) {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const ok = await setCandidateJobApplied(jobId, candidateId, applied);
  if (!ok) {
    return { error: "Could not update application status" };
  }

  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  revalidatePath(`/admin/candidates/${candidateId}/jobs/applied`);
  revalidatePath("/admin/jobs");
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function uploadAppliedJobResumeAction(
  candidateId: string,
  jobId: string,
  formData: FormData,
): Promise<{
  success?: true;
  fileName?: string;
  downloadUrl?: string | null;
  error?: string;
}> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const candidate = await getAdminCandidateById(candidateId, toStaffContext(admin));
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF or Word resume to upload." };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Resume must be 5 MB or smaller." };
  }

  if (!(RESUME_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Use a PDF or Word document (.pdf, .doc, .docx)." };
  }

  try {
    const saved = await saveApplicationResumeFile({
      candidateId,
      jobId,
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });

    const ok = await setAppliedJobResume(
      jobId,
      candidateId,
      saved.storagePath,
      saved.fileName,
    );

    if (!ok) {
      return { error: "Mark the job as applied before attaching a resume." };
    }

    const downloadUrl = await createSignedResumeUrl(saved.storagePath);

    revalidatePath(`/admin/candidates/${candidateId}/jobs`);
    revalidatePath("/dashboard/applications");

    return {
      success: true,
      fileName: saved.fileName,
      downloadUrl,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not upload resume.",
    };
  }
}
