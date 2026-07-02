import type { AdminCandidate } from "@/server/services/admin-dashboard";
import {
  experienceYearsSearchHint,
  formatExperienceYears,
} from "@/lib/format-experience-years";
import {
  composeJobSearchPosition,
  searchJobsBySources,
  type JobListing,
  type JobMarketSource,
  JOB_MARKET_SOURCES,
} from "@/server/services/job-market-search";

export type JobSearchResult = {
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string;
  relevanceScore: number;
  resumeMatch: "high" | "medium" | "low";
  source: JobMarketSource;
  postedAt: string | null;
};

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
    location: "United States",
  };
}

function experienceSearchTokens(years: number | null | undefined): string[] {
  if (years === null || years === undefined) {
    return [];
  }

  const hint = experienceYearsSearchHint(years);
  return [
    String(years),
    `${years} years`,
    `${years} year`,
    formatExperienceYears(years),
    hint ?? "",
  ].filter((token) => token.length > 0);
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

function scoreJobListing(
  job: JobListing,
  searchTerms: string[],
  hasResume: boolean,
): { score: number; resumeMatch: "high" | "medium" | "low" } {
  const haystack = [job.role, job.company, job.location, job.jdText]
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const term of searchTerms) {
    if (haystack.includes(term)) {
      hits += term.length > 5 ? 2 : 1;
    }
  }

  const maxPossible = Math.max(searchTerms.length * 2, 1);
  const normalized = Math.min(100, Math.round((hits / maxPossible) * 100));
  const score = Math.max(normalized, hits > 0 ? 40 : 20);

  let resumeMatch: "high" | "medium" | "low" = "low";
  if (hasResume) {
    if (score >= 70) {
      resumeMatch = "high";
    } else if (score >= 45) {
      resumeMatch = "medium";
    }
  } else if (score >= 55) {
    resumeMatch = "medium";
  }

  return { score, resumeMatch };
}

export async function scrapeJobsForCandidate(
  candidate: AdminCandidate,
  sources: JobMarketSource[] = [...JOB_MARKET_SOURCES],
  interestedRole?: string | null,
  options?: {
    experienceYears?: number | null;
    searchKeywords?: string | null;
  },
): Promise<{ jobs: JobSearchResult[]; searchQuery: string; errors: string[] }> {
  const experienceYears = options?.experienceYears ?? candidate.experienceYears;
  const searchKeywords = options?.searchKeywords;
  const searchTerms = buildCandidateSearchTerms(
    candidate,
    interestedRole,
    experienceYears,
    searchKeywords,
  );
  const hasResume = Boolean(candidate.resumeUrl);
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
  });

  const ranked = apifyResult.jobs
    .map((job) => {
      const { score, resumeMatch } = scoreJobListing(job, searchTerms, hasResume);
      return {
        company: job.company,
        role: job.role,
        jobUrl: job.jobUrl,
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
