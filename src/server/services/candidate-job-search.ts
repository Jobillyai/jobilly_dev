import type { AdminCandidate } from "@/server/services/admin-dashboard";
import {
  buildJobSearchFromInterests,
  searchJobsBySources,
  type ApifyJobListing,
  type JobMarketSource,
} from "@/server/services/apify-job-search";

export type JobSearchResult = {
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string;
  relevanceScore: number;
  resumeMatch: "high" | "medium" | "low";
  source: JobMarketSource;
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
): {
  position: string;
  location: string;
} {
  const roleOverride = interestedRole?.trim();
  if (roleOverride) {
    return {
      position: roleOverride,
      location: "United States",
    };
  }

  return buildJobSearchFromInterests({
    interestedTechnology: candidate.submission?.interestedTechnology,
    branch: candidate.submission?.branch,
    graduationDetails: candidate.submission?.graduationDetails,
    careerGoals: candidate.careerGoals,
  });
}

export function buildCandidateSearchTerms(
  candidate: AdminCandidate,
  interestedRole?: string | null,
): string[] {
  const parts = [
    interestedRole?.trim(),
    candidate.submission?.interestedTechnology,
    candidate.submission?.branch,
    candidate.submission?.graduationDetails,
    candidate.profileEducation,
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
  job: ApifyJobListing,
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
  sources: JobMarketSource[] = ["indeed", "linkedin"],
  interestedRole?: string | null,
): Promise<{ jobs: JobSearchResult[]; searchQuery: string; errors: string[] }> {
  const searchTerms = buildCandidateSearchTerms(candidate, interestedRole);
  const hasResume = Boolean(candidate.resumeUrl);
  const { position, location } = buildCandidateJobSearchQuery(candidate, interestedRole);
  const searchQuery = `${position} · ${location}`;

  const apifyResult = await searchJobsBySources({
    position,
    location,
    sources,
    maxItemsPerSource: 20,
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
