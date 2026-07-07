const STOP_WORDS = new Set([
  "about",
  "and",
  "are",
  "for",
  "from",
  "have",
  "our",
  "that",
  "the",
  "this",
  "with",
  "will",
  "your",
  "you",
  "role",
  "team",
  "work",
  "ability",
  "experience",
  "required",
  "preferred",
  "must",
  "should",
  "using",
  "used",
  "including",
  "within",
  "across",
  "years",
  "year",
]);

export type CandidateResumeMatchInput = {
  workExperience?: string | null;
  profileEducation?: string | null;
  specialization?: string | null;
  careerGoals?: string | null;
  skills?: string[];
  branch?: string | null;
  interestedTechnology?: string | null;
  graduationDetails?: string | null;
  interestedRole?: string | null;
  resumeText?: string | null;
};

export type JobMatchInput = {
  role: string;
  company: string;
  jdText?: string | null;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

export function buildCandidateResumeCorpus(input: CandidateResumeMatchInput): string {
  return [
    input.resumeText,
    input.interestedRole,
    input.workExperience,
    input.profileEducation,
    input.specialization,
    input.careerGoals,
    input.branch,
    input.interestedTechnology,
    input.graduationDetails,
    ...(input.skills ?? []),
  ]
    .filter(Boolean)
    .join("\n");
}

function extractJobKeywords(job: JobMatchInput): string[] {
  const jdKeywords = tokenize(
    [job.role, job.company, job.jdText ?? ""].join(" "),
  );

  const weighted: string[] = [];
  for (const token of tokenize(job.role)) {
    weighted.push(token, token);
  }

  return uniqueTokens([...weighted, ...jdKeywords]).slice(0, 40);
}

export function calculateResumeJobMatchPercent(
  resumeCorpus: string,
  job: JobMatchInput,
): number {
  const normalizedCorpus = resumeCorpus.trim().toLowerCase();
  if (!normalizedCorpus) {
    return 0;
  }

  const keywords = extractJobKeywords(job);
  if (keywords.length === 0) {
    return 0;
  }

  let matched = 0;
  for (const keyword of keywords) {
    if (normalizedCorpus.includes(keyword)) {
      matched += keyword.length > 6 ? 2 : 1;
    }
  }

  const maxWeight = keywords.reduce(
    (sum, keyword) => sum + (keyword.length > 6 ? 2 : 1),
    0,
  );

  return Math.min(100, Math.round((matched / Math.max(maxWeight, 1)) * 100));
}

export function resumeMatchLevel(
  percent: number,
): "high" | "medium" | "low" {
  if (percent >= 70) {
    return "high";
  }
  if (percent >= 45) {
    return "medium";
  }
  return "low";
}
