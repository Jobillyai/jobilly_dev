import type { AdminCandidate } from "@/server/services/admin-dashboard";
import { experienceLevelSearchTerms } from "@/lib/format-experience-years";
import {
  buildCandidateResumeCorpus,
  calculateResumeJobMatchPercent,
  resumeMatchLevel,
} from "@/lib/resume-job-match";
import {
  composeJobSearchPosition,
  isJobrightListing,
  jobMatchesSearchCriteria,
  searchJobsBySources,
  type JobListing,
  type JobListingSource,
  type JobMarketSource,
  type JobPostedWithin,
  JOB_MARKET_SOURCES,
} from "@/server/services/job-market-search";

export type JobSearchResult = {
  company: string;
  role: string;
  jobUrl: string;
  applyUrl?: string | null;
  location: string;
  jdText: string;
  relevanceScore: number;
  resumeMatch: "high" | "medium" | "low";
  source: JobListingSource;
  postedAt: string | null;
};

/** Job search currently supports the US market only — always search nationwide. */
export const JOB_SEARCH_LOCATION = "United States";

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

export function buildCandidateJobSearchQuery(
  candidate: AdminCandidate,
  interestedRole?: string | null,
  options?: { experienceYears?: number | null; searchKeywords?: string | null },
): {
  position: string;
  location: string;
} {
  const experienceYears = options?.experienceYears ?? candidate.experienceYears;
  const role = interestedRole?.trim() || candidate.jobSearchRole?.trim() || null;

  return {
    position: composeJobSearchPosition({
      interestedRole: role,
      interestedTechnology: candidate.submission?.interestedTechnology,
      branch: candidate.submission?.branch,
      graduationDetails: candidate.submission?.graduationDetails,
      careerGoals: candidate.careerGoals,
      specialization: candidate.specialization,
      profileEducation: candidate.profileEducation,
      experienceYears,
      searchKeywords: options?.searchKeywords,
    }),
    location: JOB_SEARCH_LOCATION,
  };
}

function experienceSearchTokens(years: number | null | undefined): string[] {
  return experienceLevelSearchTerms(years);
}

export function buildCandidateSearchTerms(
  candidate: AdminCandidate,
  interestedRole?: string | null,
  experienceYears?: number | null,
  searchKeywords?: string | null,
): string[] {
  const years = experienceYears ?? candidate.experienceYears;
  const parts = [
    interestedRole?.trim() || candidate.jobSearchRole?.trim(),
    searchKeywords?.trim(),
    candidate.submission?.interestedTechnology,
    candidate.submission?.branch,
    candidate.submission?.graduationDetails,
    candidate.specialization,
    candidate.profileEducation,
    candidate.workExperience,
    ...experienceSearchTokens(years),
    candidate.careerGoals,
    candidate.role.replace(/_/g, " "),
  ].filter(Boolean) as string[];

  const tokens = new Set<string>();
  for (const part of parts) {
    for (const token of tokenize(part)) {
      tokens.add(token);
    }
  }

  return [...tokens].slice(0, 24);
}

function buildResumeCorpusForCandidate(
  candidate: AdminCandidate,
  interestedRole?: string | null,
): string {
  return buildCandidateResumeCorpus({
    workExperience: candidate.workExperience,
    profileEducation: candidate.profileEducation,
    specialization: candidate.specialization,
    careerGoals: candidate.careerGoals,
    branch: candidate.submission?.branch,
    interestedTechnology: candidate.submission?.interestedTechnology,
    graduationDetails: candidate.submission?.graduationDetails,
    interestedRole: interestedRole?.trim() || candidate.jobSearchRole?.trim() || null,
  });
}

function scoreJobListing(
  job: JobListing,
  resumeCorpus: string,
): { score: number; resumeMatch: "high" | "medium" | "low" } {
  const score = calculateResumeJobMatchPercent(resumeCorpus, {
    role: job.role,
    company: job.company,
    jdText: job.jdText,
  });

  return { score, resumeMatch: resumeMatchLevel(score) };
}

export async function scrapeJobsForCandidate(
  candidate: AdminCandidate,
  sources: JobMarketSource[] = [...JOB_MARKET_SOURCES],
  interestedRole?: string | null,
  options?: {
    experienceYears?: number | null;
    searchKeywords?: string | null;
    postedWithin?: JobPostedWithin;
  },
): Promise<{ jobs: JobSearchResult[]; searchQuery: string; errors: string[] }> {
  const experienceYears = options?.experienceYears ?? candidate.experienceYears;
  const searchKeywords = options?.searchKeywords;
  const resumeCorpus = buildResumeCorpusForCandidate(candidate, interestedRole);
  const { position, location } = buildCandidateJobSearchQuery(candidate, interestedRole, {
    experienceYears,
    searchKeywords,
  });
  const searchQuery = `${position} · ${location}`;

  const apifyResult = await searchJobsBySources({
    position,
    location,
    sources,
    maxItemsPerSource: 30,
    postedWithin: options?.postedWithin,
  });

  const roleForFilter = interestedRole?.trim() || candidate.jobSearchRole?.trim() || position;

  const ranked = apifyResult.jobs
    .filter((job) => !isJobrightListing(job.source, job.jobUrl))
    .filter((job) => jobMatchesSearchCriteria(job, roleForFilter, searchKeywords))
    .map((job) => {
      const { score, resumeMatch } = scoreJobListing(job, resumeCorpus);
      return {
        company: job.company,
        role: job.role,
        jobUrl: job.jobUrl,
        applyUrl: job.applyUrl ?? null,
        location: job.location,
        jdText: job.jdText,
        relevanceScore: score,
        resumeMatch,
        source: job.source,
        postedAt: job.postedAt,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 40);

  return {
    jobs: ranked,
    searchQuery,
    errors: apifyResult.errors,
  };
}
