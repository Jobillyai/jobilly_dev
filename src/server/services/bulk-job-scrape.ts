import { refreshCandidateJobListings } from "@/server/services/candidate-jobs";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import { createAdminClient } from "@/server/db/supabase-admin";
import { getAdminCandidates, type AdminCandidate } from "@/server/services/admin-dashboard";
import { JOB_MARKET_SOURCES } from "@/server/services/job-market-search";

export type BulkScrapeCandidateResult = {
  candidateId: string;
  email: string;
  role: string;
  scrapeCalled: boolean;
  newJobsAdded: number;
  error?: string;
};

export type BulkJobScrapeResult = {
  candidatesProcessed: number;
  candidatesScraped: number;
  newJobsAdded: number;
  errors: string[];
  perCandidate: BulkScrapeCandidateResult[];
};

function defaultInterestedRole(candidate: AdminCandidate): string | null {
  return resolveCandidateJobRole(candidate);
}

export async function scrapeAllCandidateJobs(
  managerUserId: string,
  triggerType: "cron" | "manual",
): Promise<BulkJobScrapeResult> {
  const admin = createAdminClient();
  const candidates = await getAdminCandidates(undefined, admin);
  const startedAt = new Date().toISOString();

  const { data: runRow } = await admin
    .from("job_scrape_runs")
    .insert({
      triggered_by: managerUserId,
      trigger_type: triggerType,
      started_at: startedAt,
    })
    .select("id")
    .single();

  const result: BulkJobScrapeResult = {
    candidatesProcessed: 0,
    candidatesScraped: 0,
    newJobsAdded: 0,
    errors: [],
    perCandidate: [],
  };

  const orderedCandidates = [...candidates].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  const forceScrape = triggerType === "manual";

  for (const candidate of orderedCandidates) {
    const interestedRole = defaultInterestedRole(candidate);
    if (!interestedRole) {
      result.perCandidate.push({
        candidateId: candidate.id,
        email: candidate.email,
        role: "",
        scrapeCalled: false,
        newJobsAdded: 0,
        error: "No job role set — edit the role before scraping.",
      });
      continue;
    }

    result.candidatesProcessed += 1;

    try {
      const scrapeResult = await refreshCandidateJobListings(
        candidate,
        managerUserId,
        [...JOB_MARKET_SOURCES],
        interestedRole,
        { allowScrape: true, db: admin, forceScrape },
      );

      if (scrapeResult.scrapeCalled) {
        result.candidatesScraped += 1;
      }
      result.newJobsAdded += scrapeResult.newJobsAdded;

      const candidateError =
        scrapeResult.error && scrapeResult.jobs.length === 0
          ? scrapeResult.error
          : scrapeResult.warning;

      if (candidateError) {
        result.errors.push(`${candidate.email}: ${candidateError}`);
      }

      result.perCandidate.push({
        candidateId: candidate.id,
        email: candidate.email,
        role: interestedRole,
        scrapeCalled: scrapeResult.scrapeCalled,
        newJobsAdded: scrapeResult.newJobsAdded,
        error: candidateError,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scrape error";
      result.errors.push(`${candidate.email}: ${message}`);
      result.perCandidate.push({
        candidateId: candidate.id,
        email: candidate.email,
        role: interestedRole,
        scrapeCalled: false,
        newJobsAdded: 0,
        error: message,
      });
    }
  }

  if (runRow?.id) {
    await admin
      .from("job_scrape_runs")
      .update({
        candidates_processed: result.candidatesProcessed,
        candidates_scraped: result.candidatesScraped,
        new_jobs_added: result.newJobsAdded,
        errors: result.errors.slice(0, 50),
        finished_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);
  }

  return result;
}

export async function scrapeSingleCandidateJobs(
  candidate: AdminCandidate,
  managerUserId: string,
  interestedRole?: string | null,
): Promise<BulkScrapeCandidateResult> {
  const admin = createAdminClient();
  const role = interestedRole?.trim() || resolveCandidateJobRole(candidate);

  if (!role) {
    return {
      candidateId: candidate.id,
      email: candidate.email,
      role: "",
      scrapeCalled: false,
      newJobsAdded: 0,
      error: "Enter a job role before scraping.",
    };
  }

  const scrapeResult = await refreshCandidateJobListings(
    candidate,
    managerUserId,
    [...JOB_MARKET_SOURCES],
    role,
    { allowScrape: true, db: admin, forceScrape: false },
  );

  const candidateError =
    scrapeResult.error && scrapeResult.jobs.length === 0
      ? scrapeResult.error
      : scrapeResult.warning;

  return {
    candidateId: candidate.id,
    email: candidate.email,
    role,
    scrapeCalled: scrapeResult.scrapeCalled,
    newJobsAdded: scrapeResult.newJobsAdded,
    error: candidateError,
  };
}

export async function updateCandidateJobSearchRole(
  candidateId: string,
  jobSearchRole: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const trimmed = jobSearchRole.trim();

  if (!trimmed) {
    return { error: "Job role cannot be empty." };
  }

  const { data: existing } = await admin
    .from("candidate_profiles")
    .select("user_id")
    .eq("user_id", candidateId)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await admin
      .from("candidate_profiles")
      .insert({ user_id: candidateId, job_search_role: trimmed });

    if (insertError) {
      return { error: insertError.message };
    }

    return {};
  }

  const { error } = await admin
    .from("candidate_profiles")
    .update({ job_search_role: trimmed })
    .eq("user_id", candidateId);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function updateCandidateExperienceYears(
  candidateId: string,
  experienceYears: number | null,
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  if (
    experienceYears !== null &&
    (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 50)
  ) {
    return { error: "Experience must be between 0 and 50 years." };
  }

  const { data: existing } = await admin
    .from("candidate_profiles")
    .select("user_id")
    .eq("user_id", candidateId)
    .maybeSingle();

  const payload = { experience_years: experienceYears };

  if (!existing) {
    const { error: insertError } = await admin
      .from("candidate_profiles")
      .insert({ user_id: candidateId, ...payload });

    if (insertError) {
      return { error: insertError.message };
    }

    return {};
  }

  const { error } = await admin
    .from("candidate_profiles")
    .update(payload)
    .eq("user_id", candidateId);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function resolveManagerUserIdForCron(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("role", "manager")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export type LastScrapeRunSummary = {
  startedAt: string;
  finishedAt: string | null;
  triggerType: string;
  candidatesProcessed: number;
  candidatesScraped: number;
  newJobsAdded: number;
};

export async function getLastJobScrapeRun(): Promise<LastScrapeRunSummary | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_scrape_runs")
    .select(
      "started_at, finished_at, trigger_type, candidates_processed, candidates_scraped, new_jobs_added",
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    startedAt: data.started_at,
    finishedAt: data.finished_at,
    triggerType: data.trigger_type,
    candidatesProcessed: data.candidates_processed,
    candidatesScraped: data.candidates_scraped,
    newJobsAdded: data.new_jobs_added,
  };
}
