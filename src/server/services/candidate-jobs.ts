import { createClient } from "@/server/db/supabase-server";
import type { AdminCandidate } from "@/server/services/admin-dashboard";
import {
  buildCandidateSearchTerms,
  scrapeJobsForCandidate,
  type JobSearchResult,
} from "@/server/services/candidate-job-search";

export type CandidateJobListing = {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string | null;
  relevanceScore: number;
  resumeMatch: "high" | "medium" | "low";
  selected: boolean;
  scrapedAt: string;
  source: string;
};

function mapDbRow(row: {
  id: string;
  company: string;
  role: string;
  job_url: string;
  jd_text: string | null;
  relevance_score: number | null;
  selected: boolean;
  scraped_at: string;
}): CandidateJobListing {
  const score = row.relevance_score ?? 0;
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url,
    location: "Remote",
    jdText: row.jd_text,
    relevanceScore: score,
    resumeMatch: score >= 70 ? "high" : score >= 45 ? "medium" : "low",
    selected: row.selected,
    scrapedAt: row.scraped_at,
    source: "Scraped",
  };
}

function mapSearchResult(
  result: JobSearchResult,
  id: string,
  scrapedAt: string,
): CandidateJobListing {
  return {
    id,
    company: result.company,
    role: result.role,
    jobUrl: result.jobUrl,
    location: result.location,
    jdText: result.jdText,
    relevanceScore: result.relevanceScore,
    resumeMatch: result.resumeMatch,
    selected: false,
    scrapedAt,
    source: result.source,
  };
}

export async function getCandidateJobListings(
  candidateId: string,
): Promise<CandidateJobListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scraped_jobs")
    .select(
      "id, company, role, job_url, jd_text, relevance_score, selected, scraped_at",
    )
    .eq("candidate_id", candidateId)
    .order("relevance_score", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapDbRow);
}

export async function refreshCandidateJobListings(
  candidate: AdminCandidate,
  adminUserId: string,
): Promise<{ jobs: CandidateJobListing[]; searchTerms: string[] }> {
  const supabase = await createClient();
  const scraped = await scrapeJobsForCandidate(candidate);
  const searchTerms = buildCandidateSearchTerms(candidate);

  await supabase.from("scraped_jobs").delete().eq("candidate_id", candidate.id);

  if (scraped.length === 0) {
    return { jobs: [], searchTerms };
  }

  const scrapedAt = new Date().toISOString();
  const rows = scraped.map((job) => ({
    candidate_id: candidate.id,
    employee_id: adminUserId,
    company: job.company,
    role: job.role,
    job_url: job.jobUrl,
    jd_text: job.jdText,
    relevance_score: job.relevanceScore,
    selected: false,
    scraped_at: scrapedAt,
  }));

  const { data, error } = await supabase
    .from("scraped_jobs")
    .insert(rows)
    .select(
      "id, company, role, job_url, jd_text, relevance_score, selected, scraped_at",
    );

  if (error || !data) {
    return {
      jobs: scraped.map((job, index) =>
        mapSearchResult(job, `temp-${index}`, scrapedAt),
      ),
      searchTerms,
    };
  }

  return {
    jobs: data.map((row) => ({
      ...mapDbRow(row),
      location:
        scraped.find((job) => job.jobUrl === row.job_url)?.location ?? "Remote",
      source:
        scraped.find((job) => job.jobUrl === row.job_url)?.source ?? "Scraped",
    })),
    searchTerms,
  };
}

export async function setCandidateJobSelected(
  jobId: string,
  selected: boolean,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scraped_jobs")
    .update({ selected })
    .eq("id", jobId);

  return !error;
}
