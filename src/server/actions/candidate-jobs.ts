"use server";

import { revalidatePath } from "next/cache";
import {
  getAdminUser,
  staffCanAccessJobApplyPortal,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import { parseExperienceYears } from "@/lib/format-experience-years";
import { getManagedApplicationsCandidateById } from "@/server/services/admin-dashboard";
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
  analyzeCandidateResumeBuffer,
  analyzeCandidateResumeOnFile,
} from "@/server/services/candidate-resume-analyze";
import { sendCandidateApplicationsDigest } from "@/server/services/run-daily-applications-digest";
import {
  createSignedResumeUrl,
  saveCandidateResumeFile,
  saveApplicationResumeFile,
} from "@/server/services/resume-storage";
import { RESUME_MIME_TYPES } from "@/lib/resume-mime";
import { checkRateLimit, rateLimitErrorMessage } from "@/lib/rate-limit";
import {
  approveResumeTailoringRun,
  generateResumeTailoringRun,
  getLatestResumeTailoringRun,
  type ResumeTailoringRun,
} from "@/server/services/resume-tailoring-runs";
import { z } from "zod";
import { JOB_CATEGORY_IDS } from "@/lib/job-category-taxonomy";
import {
  confirmResumeCategory,
  getResumeIntelligence,
  invalidateAndAnalyzeResume,
  registerBaseResumeForIntelligence,
  removeAdminTxtOverride,
  saveAdminTxtOverride,
  validateBaseResumeFile,
} from "@/server/services/resume-intelligence";

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

function managerJobApplyError(): string {
  return "Managers cannot use the job apply portal.";
}

function assertJobApplyPortalAccess(
  staff: ReturnType<typeof toStaffContext>,
): string | null {
  if (!staffCanAccessJobApplyPortal(staff)) {
    return managerJobApplyError();
  }
  return null;
}

async function resumeIntelligenceAccess(candidateId: string) {
  const admin = await getAdminUser();
  if (!admin) return { error: "Unauthorized" } as const;
  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) return { error: portalError } as const;
  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
  if (!candidate) return { error: "Candidate not found or not assigned to you." } as const;
  return { admin, candidate } as const;
}

export async function getResumeIntelligenceAction(candidateId: string) {
  const access = await resumeIntelligenceAccess(candidateId);
  if ("error" in access) return access;
  return { success: true as const, intelligence: await getResumeIntelligence(candidateId) };
}

export async function uploadCandidateBaseResumeAction(candidateId: string, formData: FormData) {
  const access = await resumeIntelligenceAccess(candidateId);
  if ("error" in access) return access;
  const file = formData.get("baseResume");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF or DOCX resume." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Resume must be 5 MB or smaller." };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    validateBaseResumeFile(buffer, file.name, file.type);
    const saved = await saveCandidateResumeFile({
      userId: candidateId,
      fileName: file.name,
      fileBuffer: buffer,
      contentType: file.type,
    });
    try {
      await registerBaseResumeForIntelligence({
        candidateId,
        actorId: access.admin.id,
        storagePath: saved.storagePath,
        fileName: file.name,
        contentType: file.type,
        buffer,
      });
    } catch (analysisError) {
      revalidatePath(`/admin/candidates/${candidateId}/jobs`);
      return {
        success: true as const,
        warning:
          analysisError instanceof Error
            ? `Resume uploaded, but analysis failed: ${analysisError.message}`
            : "Resume uploaded, but analysis failed. Use Retry analysis.",
      };
    }
    revalidatePath(`/admin/candidates/${candidateId}/jobs`);
    revalidatePath("/admin/candidates");
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload the resume." };
  }
}

export async function uploadResumeTxtOverrideAction(candidateId: string, formData: FormData) {
  const access = await resumeIntelligenceAccess(candidateId);
  if ("error" in access) return access;
  const file = formData.get("resumeTxt");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a TXT file." };
  try {
    await saveAdminTxtOverride({
      candidateId,
      actorId: access.admin.id,
      fileName: file.name,
      contentType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    revalidatePath(`/admin/candidates/${candidateId}/jobs`);
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not analyze TXT override." };
  }
}

export async function removeResumeTxtOverrideAction(candidateId: string) {
  const access = await resumeIntelligenceAccess(candidateId);
  if ("error" in access) return access;
  try {
    await removeAdminTxtOverride(candidateId, access.admin.id);
    revalidatePath(`/admin/candidates/${candidateId}/jobs`);
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not remove TXT override." };
  }
}

export async function retryResumeIntelligenceAction(candidateId: string) {
  const access = await resumeIntelligenceAccess(candidateId);
  if ("error" in access) return access;
  try {
    await invalidateAndAnalyzeResume(candidateId);
    revalidatePath(`/admin/candidates/${candidateId}/jobs`);
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Resume analysis failed." };
  }
}

export async function confirmResumeCategoryAction(candidateId: string, category: string) {
  const access = await resumeIntelligenceAccess(candidateId);
  if ("error" in access) return access;
  const parsed = z.enum(JOB_CATEGORY_IDS).safeParse(category);
  if (!parsed.success || parsed.data === "other") return { error: "Choose a specific job category." };
  try {
    await confirmResumeCategory({
      candidateId,
      actorId: access.admin.id,
      categoryId: parsed.data,
    });
    revalidatePath(`/admin/candidates/${candidateId}/jobs`);
    return { success: true as const };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not confirm category." };
  }
}

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

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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

export async function prepareCandidateJobSearchAction(
  candidateId: string,
  sourceMode: JobSearchSourceMode = "all",
  interestedRole?: string,
  experienceYearsInput?: string | number | null,
  _searchKeywords?: string | null,
): Promise<
  | { error: string }
  | {
      success: true;
      jobs: CandidateJobListing[];
      searchRole: string;
      cacheStatus: RoleScrapeCacheStatus[];
      shouldScrape: boolean;
      sourcesToScrape: JobMarketSource[];
      info?: string;
    }
> {
  const sources = sourcesFromMode(sourceMode);
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  let candidate = await getManagedApplicationsCandidateById(candidateId, staff);
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const role = interestedRole?.trim();
  if (!role) {
    return { error: "Enter an interested role before searching." };
  }

  const canScrape = staffCanScrapeJobs(staff);

  if (canScrape) {
    const saveRole = await updateCandidateJobSearchRole(candidateId, role);
    if (saveRole.error) {
      return { error: saveRole.error };
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

    const refreshed = await getManagedApplicationsCandidateById(candidateId, staff);
    if (refreshed) {
      candidate = refreshed;
    }
  }

  const stored = await loadCandidateJobsForRole(candidateId, role, "pipeline");
  const sourcesToScrape = stored.cacheStatus
    .filter((entry) => sources.includes(entry.source) && !entry.fresh)
    .map((entry) => entry.source);

  const shouldScrape = canScrape && sourcesToScrape.length > 0;
  let info: string | undefined;

  if (!canScrape && sourcesToScrape.length > 0 && stored.jobs.length > 0) {
    info =
      "Showing stored jobs from the last search — new searches run once every 3 hours per role.";
  } else if (!shouldScrape && stored.jobs.length === 0) {
    info = canScrape
      ? "No stored jobs for this role yet. Starting a background search."
      : "No stored jobs for this role yet. An assigned mentor can search again after the 3-hour cache expires.";
  } else if (!shouldScrape && stored.jobs.length > 0) {
    info =
      stored.cacheStatus.find((entry) => sources.includes(entry.source) && entry.fresh)
        ? "Showing stored jobs — selected sources were searched within the last 3 hours."
        : undefined;
  }

  return {
    success: true,
    jobs: stored.jobs,
    searchRole: stored.searchRole,
    cacheStatus: stored.cacheStatus,
    shouldScrape,
    sourcesToScrape: shouldScrape ? sourcesToScrape : [],
    info,
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

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  let candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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

    const refreshed = await getManagedApplicationsCandidateById(candidateId, staff);
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

  const candidate = await getManagedApplicationsCandidateById(
    candidateId,
    toStaffContext(admin),
  );
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

  const candidate = await getManagedApplicationsCandidateById(
    candidateId,
    toStaffContext(admin),
  );
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

  const candidate = await getManagedApplicationsCandidateById(
    candidateId,
    toStaffContext(admin),
  );
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
      "Bulk scraping is disabled. Search jobs from each assigned candidate's job sheet (once every 3 hours per role).",
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

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
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

export type CandidateResumeAnalysisResult = {
  success?: true;
  fileName?: string;
  downloadUrl?: string;
  resumeText?: string;
  wordCount?: number;
  error?: string;
};

async function authorizeCandidateAccess(
  candidateId: string,
): Promise<
  | { error: string }
  | {
      admin: NonNullable<Awaited<ReturnType<typeof getAdminUser>>>;
      candidate: NonNullable<
        Awaited<ReturnType<typeof getManagedApplicationsCandidateById>>
      >;
    }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" as const };
  }

  const staff = toStaffContext(admin);
  const portalError = assertJobApplyPortalAccess(staff);
  if (portalError) {
    return { error: portalError };
  }

  const candidate = await getManagedApplicationsCandidateById(candidateId, staff);
  if (!candidate) {
    return { error: "Candidate not found" as const };
  }

  return { admin, candidate };
}

export async function uploadAndAnalyzeCandidateResumeAction(
  candidateId: string,
  formData: FormData,
): Promise<CandidateResumeAnalysisResult> {
  const access = await authorizeCandidateAccess(candidateId);
  if ("error" in access) {
    return { error: access.error };
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

  const interestedRole = String(formData.get("interestedRole") ?? "").trim() || null;

  try {
    const analysis = await analyzeCandidateResumeBuffer({
      candidateId,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      contentType: file.type,
      interestedRole,
      saveToProfile: true,
    });

    revalidatePath(`/admin/candidates/${candidateId}/jobs`);
    revalidatePath(`/admin/candidates/${candidateId}/jobs/applied`);

    return {
      success: true,
      fileName: analysis.fileName,
      downloadUrl: analysis.downloadUrl,
      resumeText: analysis.resumeText,
      wordCount: analysis.wordCount,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not analyze resume.",
    };
  }
}

export async function analyzeCandidateResumeOnFileAction(
  candidateId: string,
  interestedRole?: string | null,
): Promise<CandidateResumeAnalysisResult> {
  const access = await authorizeCandidateAccess(candidateId);
  if ("error" in access) {
    return { error: access.error };
  }

  try {
    const analysis = await analyzeCandidateResumeOnFile({
      candidateId,
      interestedRole: interestedRole?.trim() || null,
    });

    return {
      success: true,
      fileName: analysis.fileName,
      downloadUrl: analysis.downloadUrl,
      resumeText: analysis.resumeText,
      wordCount: analysis.wordCount,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not analyze resume on file.",
    };
  }
}

export async function sendCandidateApplicationsDigestAction(
  candidateId: string,
): Promise<
  | { success: true; jobCount: number; recipientEmail: string }
  | { error: string }
> {
  const access = await authorizeCandidateAccess(candidateId);
  if ("error" in access) {
    return { error: access.error };
  }

  if (!staffCanScrapeJobs(toStaffContext(access.admin))) {
    return { error: "Only mentors can send application summary emails." };
  }

  return sendCandidateApplicationsDigest(candidateId, {
    onlyToday: false,
    skipDuplicateCheck: true,
  });
}

export type ResumeTailoringActionResult =
  | { success: true; run: ResumeTailoringRun }
  | { error: string };

export async function getResumeTailoringRunAction(
  candidateId: string,
  jobId: string,
): Promise<ResumeTailoringActionResult | { success: true; run: null }> {
  const access = await authorizeCandidateAccess(candidateId);
  if ("error" in access) return { error: access.error };
  const run = await getLatestResumeTailoringRun(candidateId, jobId);
  return { success: true, run };
}

export async function generateResumeTailoringRunAction(
  candidateId: string,
  jobId: string,
): Promise<ResumeTailoringActionResult> {
  const access = await authorizeCandidateAccess(candidateId);
  if ("error" in access) return { error: access.error };

  const rateLimit = await checkRateLimit(
    "resumeTailoringUser",
    `${access.admin.id}:${candidateId}`,
  );
  if (!rateLimit.allowed) {
    return { error: rateLimitErrorMessage(rateLimit.retryAfterSeconds) };
  }

  const result = await generateResumeTailoringRun({
    candidateId,
    jobId,
    createdBy: access.admin.id,
    candidateName: access.candidate.name || access.candidate.email.split("@")[0] || "Candidate",
    targetRole: access.candidate.jobSearchRole,
  });
  if ("error" in result) return result;

  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  revalidatePath(`/admin/candidates/${candidateId}/jobs/applied`);
  return { success: true, run: result.run };
}

export async function approveResumeTailoringRunAction(
  candidateId: string,
  jobId: string,
  runId: string,
): Promise<ResumeTailoringActionResult> {
  const access = await authorizeCandidateAccess(candidateId);
  if ("error" in access) return { error: access.error };

  const approved = await approveResumeTailoringRun({
    runId,
    candidateId,
    jobId,
    approvedBy: access.admin.id,
  });
  if (!approved) {
    return { error: "This resume could not be approved. Refresh and try again." };
  }

  const run = await getLatestResumeTailoringRun(candidateId, jobId);
  if (!run) return { error: "Approved resume could not be reloaded." };
  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  revalidatePath(`/admin/candidates/${candidateId}/jobs/applied`);
  revalidatePath("/dashboard/applications");
  return { success: true, run };
}
