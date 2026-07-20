import { z } from "zod";
import {
  JOB_CATEGORY_IDS,
  detectJobCategory,
  type JobCategoryId,
  type StrictJobIntent,
} from "@/lib/job-category-taxonomy";
import type { JobListing } from "@/server/services/job-market-search";
import { geminiGenerateJson, parseGeminiJsonText } from "@/server/services/gemini-generate";

const responseSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int().min(0),
      categoryId: z.enum(JOB_CATEGORY_IDS),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type ClassifiedMarketJob = {
  job: JobListing;
  detectedCategory: JobCategoryId;
  confidence: number;
};

export const AMBIGUOUS_CATEGORY_CLASSIFICATION_FAILED =
  "Some jobs could not be auto-classified by title, and Gemini category lookup failed — those listings were skipped.";

export async function classifyJobsForStrictIntent(
  jobs: JobListing[],
  intent: StrictJobIntent,
): Promise<{ accepted: ClassifiedMarketJob[]; rejectedCount: number; error?: string }> {
  const accepted: ClassifiedMarketJob[] = [];
  const ambiguous: Array<{ job: JobListing; index: number }> = [];
  let rejectedCount = 0;

  jobs.forEach((job, index) => {
    const found = detectJobCategory(job.role, job.jdText);
    if (found.categoryId === intent.categoryId) {
      const titleOkay =
        !intent.acceptedTitlePatterns.length ||
        intent.acceptedTitlePatterns.some((pattern) =>
          job.role.toLowerCase().includes(pattern.toLowerCase()),
        );
      if (titleOkay) {
        accepted.push({
          job,
          detectedCategory: found.categoryId,
          confidence: found.confidence,
        });
      } else {
        rejectedCount += 1;
      }
    } else if (found.categoryId === "other") {
      ambiguous.push({ job, index });
    } else {
      rejectedCount += 1;
    }
  });

  if (!ambiguous.length) {
    return { accepted, rejectedCount };
  }

  const compact = ambiguous.map(({ job, index }) => ({
    index,
    title: job.role,
    description: job.jdText.slice(0, 2500),
  }));

  const prompt = `Classify each job into exactly one occupational category: ${JOB_CATEGORY_IDS.join(", ")}.
Data Center Technician is IT infrastructure; Data Technician is data operations.
Keep electrical/electronics, mechanical/maintenance/field service, and medical/lab technicians separate.
Return JSON {"results":[{"index":0,"categoryId":"","confidence":0}]}.
Target candidate category: ${intent.categoryId}
Jobs: ${JSON.stringify(compact)}`;

  const generated = await geminiGenerateJson({ prompt, temperature: 0 });

  if ("error" in generated) {
    return {
      accepted,
      rejectedCount: rejectedCount + ambiguous.length,
      error: generated.error.includes("GEMINI_API_KEY")
        ? "Ambiguous jobs were rejected because category classification is unavailable."
        : AMBIGUOUS_CATEGORY_CLASSIFICATION_FAILED,
    };
  }

  try {
    const parsed = responseSchema.parse(parseGeminiJsonText(generated.text));
    const byIndex = new Map(parsed.results.map((result) => [result.index, result]));

    for (const item of ambiguous) {
      const result = byIndex.get(item.index);
      if (
        result?.categoryId === intent.categoryId &&
        !intent.excludedCategoryIds.includes(result.categoryId)
      ) {
        accepted.push({
          job: item.job,
          detectedCategory: result.categoryId,
          confidence: result.confidence,
        });
      } else {
        rejectedCount += 1;
      }
    }

    return { accepted, rejectedCount };
  } catch (error) {
    console.error("Gemini category JSON parse failed:", error);
    return {
      accepted,
      rejectedCount: rejectedCount + ambiguous.length,
      error: AMBIGUOUS_CATEGORY_CLASSIFICATION_FAILED,
    };
  }
}
