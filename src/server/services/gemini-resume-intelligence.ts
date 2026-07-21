import "server-only";
import { z } from "zod";
import {
  JOB_CATEGORY_IDS,
  JOB_CATEGORY_LABELS,
  JOB_TAXONOMY_VERSION,
  type JobCategoryId,
} from "@/lib/job-category-taxonomy";
import { mergeResumeSkillsIntoSearchKeywords } from "@/lib/job-keyword-match";
import {
  geminiGenerateJson,
  getGeminiApiKey,
  parseGeminiJsonText,
} from "@/server/services/gemini-generate";

export const RESUME_INTELLIGENCE_PROMPT_VERSION = "2026-07-v2";
export const RESUME_INTELLIGENCE_SCHEMA_VERSION = "2026-07-v1";

const RESUME_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-2.0-flash",
] as const;

const schema = z.object({
  targetRoles: z.array(z.string().min(2).max(100)).min(1).max(8),
  responsibilities: z.array(z.string().min(2).max(240)).max(30),
  skills: z.array(z.string().min(1).max(100)).max(50),
  searchKeywords: z.array(z.string().min(1).max(80)).min(1).max(60),
  canonicalSearchTitle: z.string().min(2).max(100),
  categoryId: z.enum(JOB_CATEGORY_IDS),
  confidence: z.number().min(0).max(1),
  acceptedTitlePatterns: z.array(z.string().min(2).max(80)).max(12),
  excludedCategoryIds: z.array(z.enum(JOB_CATEGORY_IDS)).max(12),
});

const looseSchema = z.object({
  targetRoles: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  canonicalSearchTitle: z.string().optional(),
  categoryId: z.string().optional(),
  confidence: z.union([z.number(), z.string()]).optional(),
  acceptedTitlePatterns: z.array(z.string()).optional(),
  excludedCategoryIds: z.array(z.string()).optional(),
});

export type ResumeIntentResult = z.infer<typeof schema> & { model: string };

const CATEGORY_LABEL_TO_ID = Object.fromEntries(
  Object.entries(JOB_CATEGORY_LABELS).map(([id, label]) => [
    label.toLowerCase(),
    id,
  ]),
) as Record<string, JobCategoryId>;

function clampStrings(
  values: string[] | undefined,
  minLength: number,
  maxItems: number,
  maxItemLength?: number,
): string[] {
  return (values ?? [])
    .map((value) => {
      const trimmed = value.trim();
      return maxItemLength ? trimmed.slice(0, maxItemLength) : trimmed;
    })
    .filter((value) => value.length >= minLength)
    .slice(0, maxItems);
}

function normalizeCategoryId(value: string | undefined): JobCategoryId {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "other";

  const slug = trimmed.toLowerCase().replace(/[\s-]+/g, "_");
  if ((JOB_CATEGORY_IDS as readonly string[]).includes(slug)) {
    return slug as JobCategoryId;
  }

  const fromLabel = CATEGORY_LABEL_TO_ID[trimmed.toLowerCase()];
  if (fromLabel) return fromLabel;

  return "other";
}

function normalizeConfidence(value: unknown): number {
  const parsed =
    typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(parsed)) return 0.5;
  if (parsed > 1) return Math.min(1, parsed / 100);
  return Math.min(1, Math.max(0, parsed));
}

function normalizeResumeIntent(raw: unknown): z.infer<typeof schema> | null {
  const loose = looseSchema.safeParse(raw);
  if (!loose.success) return null;

  const skills = clampStrings(loose.data.skills, 1, 50, 100);
  const searchKeywords = mergeResumeSkillsIntoSearchKeywords(
    skills,
    clampStrings(loose.data.searchKeywords, 1, 60, 80),
  ).slice(0, 60);
  if (!searchKeywords.length) return null;

  const canonicalSearchTitle = (loose.data.canonicalSearchTitle ?? "")
    .trim()
    .slice(0, 100);
  const targetRoles = clampStrings(loose.data.targetRoles, 2, 8, 100);
  if (!targetRoles.length && canonicalSearchTitle.length >= 2) {
    targetRoles.push(canonicalSearchTitle);
  }
  if (!targetRoles.length) return null;

  const normalized = {
    targetRoles,
    responsibilities: clampStrings(loose.data.responsibilities, 2, 30, 240),
    skills,
    searchKeywords,
    canonicalSearchTitle:
      canonicalSearchTitle.length >= 2 ? canonicalSearchTitle : targetRoles[0],
    categoryId: normalizeCategoryId(loose.data.categoryId),
    confidence: normalizeConfidence(loose.data.confidence),
    acceptedTitlePatterns: clampStrings(
      loose.data.acceptedTitlePatterns,
      2,
      12,
      80,
    ),
    excludedCategoryIds: Array.from(
      new Set(
        (loose.data.excludedCategoryIds ?? []).map((value) =>
          normalizeCategoryId(value),
        ),
      ),
    ).slice(0, 12),
  };

  const parsed = schema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

export async function classifyResumeIntent(input: {
  resumeText: string;
  interestedRole?: string | null;
}): Promise<ResumeIntentResult> {
  if (!getGeminiApiKey()) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = `Classify this resume for a strict occupational job search. JSON only.
categoryId must be one of: ${JOB_CATEGORY_IDS.join(", ")}.
Taxonomy ${JOB_TAXONOMY_VERSION}. Data Center Technician is IT infrastructure.
Data Technician is data operations. Never merge either with electrical/electronics,
mechanical/maintenance, field service, or medical/lab technicians. If ambiguous use
other and confidence below .70. acceptedTitlePatterns are literal title phrases.
Shape: {"targetRoles":[],"responsibilities":[],"skills":[],"searchKeywords":[],
"canonicalSearchTitle":"","categoryId":"","confidence":0,"acceptedTitlePatterns":[],
"excludedCategoryIds":[]}
skills: concrete tools, languages, frameworks, platforms, and technical competencies
from the resume (max 50). searchKeywords: must include EVERY skill plus any extra
role-specific search terms (tools, tech stack, domain phrases) useful for job boards.
Keep searchKeywords at 60 items or fewer. Keep each responsibility under 240 characters.
Do not omit skills from searchKeywords.
CRITICAL: This resume may belong to a different person than any previous upload for this account.
Derive targetRoles, skills, and canonicalSearchTitle ONLY from the resume text below.
Ignore any memory of a prior candidate name, title, or employer.
${
  input.interestedRole?.trim()
    ? `Optional hint (do not invent experience to match it): ${input.interestedRole.trim()}`
    : "No prior role hint — classify only from this resume."
}
Resume:
${input.resumeText.slice(0, 50000)}`;

  let lastError = "Resume analysis returned an invalid structure.";

  for (const model of RESUME_MODELS) {
    const generated = await geminiGenerateJson({
      prompt,
      models: [model],
      temperature: 0.05,
      maxOutputTokens: 4096,
    });

    if ("error" in generated) {
      lastError = generated.error;
      continue;
    }

    try {
      const normalized = normalizeResumeIntent(
        parseGeminiJsonText(generated.text),
      );
      if (normalized) {
        return { ...normalized, model: generated.model };
      }
      console.error(`Resume intent normalization failed (${model}).`);
    } catch (error) {
      console.error(`Resume intent JSON parse failed (${model}):`, error);
    }
  }

  throw new Error(lastError);
}
