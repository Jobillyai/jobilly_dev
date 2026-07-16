import "server-only";

import {
  calculateTailoredResumeAtsScore,
  tailoredResumeSchema,
  validateTailoredResumeEvidence,
  type TailoredResume,
} from "@/lib/resume-tailoring";

export const RESUME_TAILORING_PROMPT_VERSION = "2026-07-v1";
const DEFAULT_MODEL = "gemini-2.5-flash";
const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
];

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; code?: number };
};

function apiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || null;
}

function systemPrompt(): string {
  return `You are a conservative resume editor. Tailor a candidate's existing resume to a job description while preserving truth.

NON-NEGOTIABLE RULES:
- Never invent employers, roles, dates, education, certifications, projects, technologies, metrics, responsibilities, or achievements.
- Use only facts present in SOURCE RESUME.
- Reorder and rewrite for clarity and ATS alignment, but do not add unsupported requirements.
- Every summary claim, experience item, education item, project, and rewritten bullet must include a verbatim evidence excerpt copied from SOURCE RESUME.
- Skills and certifications must appear verbatim in SOURCE RESUME.
- Preserve every number exactly; never introduce a number absent from that item's evidence.
- Put JD requirements absent from the source in missingRequirements, never in the resume.
- Return JSON only. Do not use markdown.

Return this exact shape:
{
  "contact": {"name":"","email":"","phone":"","location":"","linkedin":"","website":""},
  "headline":"",
  "headlineEvidence":"verbatim source excerpt",
  "summary":"",
  "summaryEvidence":["verbatim source excerpt"],
  "skills":[""],
  "experience":[{"company":"","role":"","location":"","startDate":"","endDate":"","evidence":"verbatim source excerpt","bullets":[{"text":"","evidence":"verbatim source excerpt"}]}],
  "education":[{"institution":"","degree":"","date":"","details":"","evidence":"verbatim source excerpt"}],
  "projects":[{"name":"","technologies":[""],"evidence":"verbatim source excerpt","bullets":[{"text":"","evidence":"verbatim source excerpt"}]}],
  "certifications":[""],
  "matchedKeywords":["JD keyword supported by source"],
  "missingRequirements":["JD requirement absent from source"],
  "changeSummary":["short explanation of an editorial change"]
}`;
}

function parseJsonText(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export type TailoringGenerationResult =
  | {
      resume: TailoredResume;
      atsScore: number;
      model: string;
    }
  | { error: string };

export async function generateTailoredResume(input: {
  sourceResumeText: string;
  jobDescription: string;
  candidateTargetRole?: string | null;
}): Promise<TailoringGenerationResult> {
  const key = apiKey();
  if (!key) return { error: "GEMINI_API_KEY is not configured." };

  const userPrompt = `TARGET ROLE: ${input.candidateTargetRole?.trim() || "Use the listed job title"}

SOURCE RESUME:
${input.sourceResumeText.slice(0, 50_000)}

JOB DESCRIPTION:
${input.jobDescription.slice(0, 30_000)}

Produce the factual tailored resume JSON now.`;
  const preferred = process.env.RESUME_TAILORING_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const models = [...new Set([preferred, ...FALLBACK_MODELS])];
  let lastMessage = "The resume model is temporarily unavailable.";

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt() }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              ...(model.startsWith("gemini-2.5")
                ? { thinkingConfig: { thinkingBudget: 0 } }
                : {}),
            },
          }),
        },
      );
      if (!response.ok) {
        const body = await response.text();
        console.error(
          `Resume tailoring Gemini error ${response.status} (${model}):`,
          body.slice(0, 800),
        );
        lastMessage =
          response.status === 429
            ? "Resume generation is rate-limited. Please retry in a minute."
            : "The resume model could not complete this request.";
        if (response.status === 404 || response.status === 429 || response.status >= 500) {
          continue;
        }
        return { error: lastMessage };
      }

      const payload = (await response.json()) as GeminiResponse;
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();
      if (!text) {
        lastMessage = payload.error?.message || "The resume model returned no content.";
        continue;
      }

      let raw: unknown;
      try {
        raw = parseJsonText(text);
      } catch {
        lastMessage = "The resume model returned invalid JSON. Please retry.";
        continue;
      }
      const parsed = tailoredResumeSchema.safeParse(raw);
      if (!parsed.success) {
        console.error("Tailored resume schema error:", parsed.error.flatten());
        lastMessage = "The generated resume did not match the required structure.";
        continue;
      }
      const evidenceErrors = validateTailoredResumeEvidence(
        parsed.data,
        input.sourceResumeText,
      );
      if (evidenceErrors.length > 0) {
        console.error("Tailored resume evidence errors:", evidenceErrors.slice(0, 20));
        return {
          error:
            "Generation was blocked because some claims were not traceable to the source resume. Retry or use manual upload.",
        };
      }

      return {
        resume: parsed.data,
        atsScore: calculateTailoredResumeAtsScore(parsed.data),
        model,
      };
    } catch (error) {
      lastMessage =
        error instanceof Error && error.name === "AbortError"
          ? "Resume generation timed out. Please retry."
          : "Could not reach the resume generation service.";
    } finally {
      clearTimeout(timer);
    }
  }

  return { error: lastMessage };
}
