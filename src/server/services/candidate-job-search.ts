import type { AdminCandidate } from "@/server/services/admin-dashboard";
import { experienceLevelSearchTerms } from "@/lib/format-experience-years";
import {
  buildCandidateResumeCorpus,
  calculateResumeJobMatchPercent,
  resumeMatchLevel,
} from "@/lib/resume-job-match";
import { composeJobSearchPosition } from "@/lib/job-search-position";
import {
  isJobrightListing,
  jobMatchesSearchCriteria,
  searchJobsBySources,
  type JobListing,
  type JobListingSource,
  type JobMarketSource,
  type JobPostedWithin,
  JOB_MARKET_SOURCES,
} from "@/server/services/job-market-search";
import { type JobCategoryId, type StrictJobIntent } from "@/lib/job-category-taxonomy";
import { classifyJobsForStrictIntent } from "@/server/services/gemini-job-category";
import {
  countMatchedJobKeywords,
  keywordCoveragePercent,
  requiresSkillDescriptionMatch,
  resolveSkillMatchKeywords,
} from "@/lib/job-keyword-match";

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
  detectedCategory?: JobCategoryId;
  categoryConfidence?: number;
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
    resumeText: candidate.analyzedResumeText,
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

function quotedOrGroup(values: string[]): string {
  const uniqueValues = [
    ...new Set(
      values
        .map((value) => value.replace(/"/g, "").trim())
        .filter(Boolean),
    ),
  ];
  return uniqueValues.map((value) => `"${value}"`).join(" OR ");
}

function buildStrictSearchPosition(
  canonicalTitle: string,
  targetRoles: string[],
  keywords: string[],
): string {
  const roleClause = quotedOrGroup([canonicalTitle, ...targetRoles]);
  const keywordClause = quotedOrGroup(keywords);

  const roleQuery = roleClause ? `(${roleClause})` : canonicalTitle.trim();
  return keywordClause ? `${roleQuery} (${keywordClause})` : roleQuery;
}

export async function scrapeJobsForCandidate(
  candidate: AdminCandidate,
  sources: JobMarketSource[] = [...JOB_MARKET_SOURCES],
  interestedRole?: string | null,
  options?: {
    experienceYears?: number | null;
    searchKeywords?: string | null;
    postedWithin?: JobPostedWithin;
    strictIntent?: StrictJobIntent;
  },
): Promise<{ jobs: JobSearchResult[]; searchQuery: string; errors: string[]; rejectedCount: number }> {
  const experienceYears = options?.experienceYears ?? candidate.experienceYears;
  const queryKeywords = options?.strictIntent?.searchKeywords ?? [];
  const matchSkills = options?.strictIntent
    ? resolveSkillMatchKeywords(
        options.searchKeywords,
        options.strictIntent.skills,
      )
    : [];
  const searchKeywords = options?.searchKeywords;
  const resumeCorpus = buildResumeCorpusForCandidate(candidate, interestedRole);
  const { position, location } = options?.strictIntent
    ? {
        position: buildStrictSearchPosition(
          options.strictIntent.canonicalSearchTitle,
          options.strictIntent.targetRoles,
          queryKeywords,
        ),
        location: JOB_SEARCH_LOCATION,
      }
    : buildCandidateJobSearchQuery(candidate, interestedRole, {
        experienceYears,
        searchKeywords,
      });
  const searchQuery = `${position} · ${location}`;

  const apifyResult = await searchJobsBySources({
    position,
    location,
    sources,
    postedWithin: options?.postedWithin,
    // Cap per-source volume so Apify finishes faster.
    maxItemsPerSource: 30,
    // Fortune-500 second pass is expensive; keep it off the hot path.
    includeFortune500: false,
  });

  const roleForFilter = interestedRole?.trim() || candidate.jobSearchRole?.trim() || position;

  // Local category rules only on the scrape path — skip Gemini so results
  // return without waiting on a second AI round-trip.
  const classified = options?.strictIntent
    ? await classifyJobsForStrictIntent(apifyResult.jobs, options.strictIntent, {
        useGemini: false,
      })
    : null;
  let rejectedCount = classified?.rejectedCount ?? 0;
  const categoryGated: Array<
    JobListing & {
      strictDetectedCategory?: JobCategoryId;
      strictCategoryConfidence?: number;
    }
  > = classified
    ? classified.accepted.map((entry) => ({
        ...entry.job,
        strictDetectedCategory: entry.detectedCategory,
        strictCategoryConfidence: entry.confidence,
      }))
    : apifyResult.jobs;
  const keywordMinimum = Math.min(2, matchSkills.length);
  const keywordGated = categoryGated.filter((job) => {
    if (!options?.strictIntent || keywordMinimum === 0) return true;
    if (!requiresSkillDescriptionMatch(job.source)) return true;
    const matched = countMatchedJobKeywords(matchSkills, {
      jdText: job.jdText,
    });
    if (matched < keywordMinimum) {
      rejectedCount += 1;
      return false;
    }
    return true;
  });
  const ranked = keywordGated
    .filter((job) => !isJobrightListing(job.source, job.jobUrl))
    .filter((job) =>
      options?.strictIntent
        ? true
        : jobMatchesSearchCriteria(job, roleForFilter, searchKeywords),
    )
    .map((job) => {
      const { score } = scoreJobListing(job, resumeCorpus);
      const keywordMatchCount = options?.strictIntent
        ? countMatchedJobKeywords(matchSkills, { jdText: job.jdText })
        : 0;
      const keywordScore = options?.strictIntent
        ? Math.max(
            keywordCoveragePercent(keywordMatchCount, matchSkills.length),
            Math.min(100, keywordMatchCount * 10),
          )
        : score;
      const combinedScore = options?.strictIntent
        ? Math.round(keywordScore * 0.9 + score * 0.1)
        : score;
      return {
        company: job.company,
        role: job.role,
        jobUrl: job.jobUrl,
        applyUrl: job.applyUrl ?? null,
        location: job.location,
        jdText: job.jdText,
        relevanceScore: combinedScore,
        resumeMatch: resumeMatchLevel(combinedScore),
        source: job.source,
        postedAt: job.postedAt,
        detectedCategory: job.strictDetectedCategory,
        categoryConfidence: job.strictCategoryConfidence,
        keywordMatchCount,
      };
    })
    .sort(
      (a, b) =>
        b.keywordMatchCount - a.keywordMatchCount ||
        b.relevanceScore - a.relevanceScore,
    );

  return {
    jobs: ranked,
    searchQuery,
    errors: [
      ...new Set([
        ...apifyResult.errors,
        ...(classified?.error ? [classified.error] : []),
      ]),
    ],
    rejectedCount,
  };
}
