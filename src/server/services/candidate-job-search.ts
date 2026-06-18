import type { AdminCandidate } from "@/server/services/admin-dashboard";

export type JobSearchResult = {
  company: string;
  role: string;
  jobUrl: string;
  location: string;
  jdText: string;
  relevanceScore: number;
  resumeMatch: "high" | "medium" | "low";
  source: string;
};

type RemotiveJob = {
  id: number;
  title: string;
  company_name: string;
  url: string;
  candidate_required_location: string;
  description: string;
  tags: string[];
  job_type: string;
};

type RemotiveResponse = {
  jobs: RemotiveJob[];
};

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

export function buildCandidateSearchTerms(candidate: AdminCandidate): string[] {
  const parts = [
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

function scoreJob(
  job: RemotiveJob,
  searchTerms: string[],
  hasResume: boolean,
): { score: number; resumeMatch: "high" | "medium" | "low" } {
  const haystack = [
    job.title,
    job.company_name,
    job.description,
    job.candidate_required_location,
    job.job_type,
    ...(job.tags ?? []),
  ]
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
  const score = Math.max(normalized, hits > 0 ? 35 : 15);

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

function truncate(text: string, max = 220): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1)}…`;
}

export async function scrapeJobsForCandidate(
  candidate: AdminCandidate,
): Promise<JobSearchResult[]> {
  const searchTerms = buildCandidateSearchTerms(candidate);
  const hasResume = Boolean(candidate.resumeUrl);

  let jobs: RemotiveJob[] = [];

  try {
    const response = await fetch("https://remotive.com/api/remote-jobs", {
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const payload = (await response.json()) as RemotiveResponse;
      jobs = payload.jobs ?? [];
    }
  } catch {
    jobs = [];
  }

  const ranked = jobs
    .map((job) => {
      const { score, resumeMatch } = scoreJob(job, searchTerms, hasResume);
      return {
        company: job.company_name,
        role: job.title,
        jobUrl: job.url,
        location: job.candidate_required_location || "Remote",
        jdText: truncate(job.description),
        relevanceScore: score,
        resumeMatch,
        source: "Remotive",
      };
    })
    .filter((job) => job.relevanceScore >= 30)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 30);

  if (ranked.length > 0) {
    return ranked;
  }

  return jobs.slice(0, 12).map((job) => ({
    company: job.company_name,
    role: job.title,
    jobUrl: job.url,
    location: job.candidate_required_location || "Remote",
    jdText: truncate(job.description),
    relevanceScore: 25,
    resumeMatch: hasResume ? "medium" : "low",
    source: "Remotive",
  }));
}
