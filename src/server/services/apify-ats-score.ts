export const ATS_TARGET_ROLES = [
  "AI/ML Research Scientist",
  "Backend Developer",
  "Business Analyst",
  "Cloud Architect",
  "Cybersecurity Analyst",
  "Data Analyst",
  "Data Scientist",
  "DevOps Engineer",
  "Financial Analyst",
  "Frontend Developer",
  "Full Stack Developer",
  "HR Manager",
  "Machine Learning Engineer",
  "Marketing Manager",
  "Mobile Developer",
  "Product Manager",
  "Project Manager",
  "Sales Executive",
  "Software Engineer",
  "UX/UI Designer",
] as const;

export type AtsTargetRole = (typeof ATS_TARGET_ROLES)[number];

export const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const APIFY_ATS_ACTOR_ID = "moving_beacon-owner1~my-actor-61";

export type AtsScoreBreakdownItem = {
  score: number;
  max: number;
};

export type AtsImprovement = {
  category?: string;
  priority?: string;
  message?: string;
  suggestedKeywords?: string[];
};

export type AtsScoreResult = {
  atsScore: number;
  grade: string;
  targetRole: string;
  wordCount?: number;
  bulletPoints?: number;
  quantifiedMetrics?: number;
  keywordMatchPercent?: number;
  scoreBreakdown?: Record<string, AtsScoreBreakdownItem>;
  keywords?: {
    found?: string[];
    missing?: string[];
    total?: number;
  };
  actionVerbs?: {
    strong?: string[];
    weak?: string[];
  };
  sectionsDetected?: Record<string, boolean>;
  contactInfo?: {
    email?: string | null;
    phone?: string | null;
    linkedin?: string | null;
  };
  improvements?: AtsImprovement[];
};

export function getApifyToken(): string | null {
  return (
    process.env.APIFY_API_TOKEN?.trim() ||
    process.env.APIFY_KEY?.trim() ||
    null
  );
}

export function extractCustomKeywords(jobDescription: string): string | undefined {
  const stopWords = new Set([
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
  ]);

  const tokens = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));

  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const keywords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([word]) => word);

  if (keywords.length === 0) {
    return undefined;
  }

  return keywords.join(", ");
}

export function mapInterestedRoleToAtsTarget(
  interestedRole: string | null | undefined,
): AtsTargetRole {
  const role = interestedRole?.trim();
  if (!role) {
    return "Software Engineer";
  }

  const lower = role.toLowerCase();
  const exact = ATS_TARGET_ROLES.find((entry) => entry.toLowerCase() === lower);
  if (exact) {
    return exact;
  }

  for (const entry of ATS_TARGET_ROLES) {
    const entryLower = entry.toLowerCase();
    if (lower.includes(entryLower) || entryLower.includes(lower)) {
      return entry;
    }
  }

  if (lower.includes("frontend") || lower.includes("front-end")) {
    return "Frontend Developer";
  }
  if (lower.includes("backend") || lower.includes("back-end")) {
    return "Backend Developer";
  }
  if (lower.includes("full stack") || lower.includes("fullstack")) {
    return "Full Stack Developer";
  }
  if (lower.includes("devops")) {
    return "DevOps Engineer";
  }
  if (lower.includes("machine learning") || lower.includes("ml engineer")) {
    return "Machine Learning Engineer";
  }
  if (lower.includes("data scientist")) {
    return "Data Scientist";
  }
  if (lower.includes("data analyst")) {
    return "Data Analyst";
  }
  if (lower.includes("product manager")) {
    return "Product Manager";
  }
  if (lower.includes("project manager")) {
    return "Project Manager";
  }
  if (lower.includes("business analyst")) {
    return "Business Analyst";
  }
  if (lower.includes("ux") || lower.includes("ui designer")) {
    return "UX/UI Designer";
  }

  return "Software Engineer";
}

function normalizeAtsResult(raw: Record<string, unknown>): AtsScoreResult {
  return {
    atsScore: Number(raw.atsScore ?? 0),
    grade: String(raw.grade ?? "—"),
    targetRole: String(raw.targetRole ?? ""),
    wordCount: typeof raw.wordCount === "number" ? raw.wordCount : undefined,
    bulletPoints:
      typeof raw.bulletPoints === "number" ? raw.bulletPoints : undefined,
    quantifiedMetrics:
      typeof raw.quantifiedMetrics === "number" ? raw.quantifiedMetrics : undefined,
    keywordMatchPercent:
      typeof raw.keywordMatchPercent === "number"
        ? raw.keywordMatchPercent
        : undefined,
    scoreBreakdown:
      typeof raw.scoreBreakdown === "object" && raw.scoreBreakdown !== null
        ? (raw.scoreBreakdown as Record<string, AtsScoreBreakdownItem>)
        : undefined,
    keywords:
      typeof raw.keywords === "object" && raw.keywords !== null
        ? (raw.keywords as AtsScoreResult["keywords"])
        : undefined,
    actionVerbs:
      typeof raw.actionVerbs === "object" && raw.actionVerbs !== null
        ? (raw.actionVerbs as AtsScoreResult["actionVerbs"])
        : undefined,
    sectionsDetected:
      typeof raw.sectionsDetected === "object" && raw.sectionsDetected !== null
        ? (raw.sectionsDetected as Record<string, boolean>)
        : undefined,
    contactInfo:
      typeof raw.contactInfo === "object" && raw.contactInfo !== null
        ? (raw.contactInfo as AtsScoreResult["contactInfo"])
        : undefined,
    improvements: Array.isArray(raw.improvements)
      ? (raw.improvements as AtsImprovement[])
      : undefined,
  };
}

export async function runApifyAtsScoreCheck(input: {
  resumeUrl: string;
  targetRole: AtsTargetRole;
  customKeywords?: string;
}): Promise<{ result: AtsScoreResult } | { error: string }> {
  const token = getApifyToken();

  if (!token) {
    return {
      error: "Add APIFY_API_TOKEN or APIFY_KEY to your environment to run ATS checks.",
    };
  }

  if (!input.resumeUrl) {
    return { error: "Upload a PDF or Word resume to run the ATS check." };
  }

  const body: Record<string, string> = {
    targetRole: input.targetRole,
    resumeUrl: input.resumeUrl,
  };

  if (input.customKeywords) {
    body.customKeywords = input.customKeywords;
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ATS_ACTOR_ID}/run-sync-get-dataset-items?timeout=120`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      error: `Apify ATS check failed (${response.status}): ${errorBody.slice(0, 240)}`,
    };
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload) || payload.length === 0) {
    return { error: "Apify returned no ATS score data." };
  }

  const firstItem = payload[0];

  if (typeof firstItem !== "object" || firstItem === null) {
    return { error: "Apify returned an invalid ATS score payload." };
  }

  const record = firstItem as Record<string, unknown>;

  if (typeof record.error === "string") {
    return { error: record.error };
  }

  return { result: normalizeAtsResult(record) };
}
