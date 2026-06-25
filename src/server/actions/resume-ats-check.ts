"use server";

import { z } from "zod";
import { createClient } from "@/server/db/supabase-server";
import {
  ATS_TARGET_ROLES,
  RESUME_MIME_TYPES,
} from "@/server/services/apify-ats-score";
import {
  createResumeAtsCheck,
  getFreshCandidateResumeUrl,
  saveCandidateResumeFile,
} from "@/server/services/resume-ats-check";

const checkSchema = z.object({
  targetRole: z.enum(ATS_TARGET_ROLES),
  jobDescription: z.string().max(12000).optional(),
});

export type AtsResumeCheckState = {
  success?: boolean;
  error?: string;
  checkId?: string;
  atsScore?: number;
  grade?: string;
  result?: import("@/server/services/apify-ats-score").AtsScoreResult;
  fieldErrors?: Partial<
    Record<"targetRole" | "jobDescription" | "resume", string>
  >;
};

async function resolveResumeUpload(
  userId: string,
  formData: FormData,
): Promise<{ resumeUrl: string; fileName: string } | { error: string }> {
  const file = formData.get("resume");

  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: "Resume must be 5 MB or smaller." };
    }

    if (!RESUME_MIME_TYPES.includes(file.type as (typeof RESUME_MIME_TYPES)[number])) {
      return { error: "Upload a PDF or Word document (.pdf, .doc, .docx)." };
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await saveCandidateResumeFile({
      userId,
      fileName: file.name,
      fileBuffer,
      contentType: file.type,
    });

    return { resumeUrl: uploaded.resumeUrl, fileName: file.name };
  }

  const existingResume = await getFreshCandidateResumeUrl(userId);
  if (existingResume) {
    return existingResume;
  }

  return { error: "Upload a PDF or Word resume to continue." };
}

export async function checkAtsResumeAction(
  _prevState: AtsResumeCheckState,
  formData: FormData,
): Promise<AtsResumeCheckState> {
  const parsed = checkSchema.safeParse({
    targetRole: formData.get("targetRole"),
    jobDescription: formData.get("jobDescription") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<AtsResumeCheckState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "targetRole" || key === "jobDescription") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "You must be logged in to check your resume." };
  }

  const resumeUpload = await resolveResumeUpload(authData.user.id, formData);

  if ("error" in resumeUpload) {
    return { fieldErrors: { resume: resumeUpload.error } };
  }

  try {
    const result = await createResumeAtsCheck({
      userId: authData.user.id,
      targetRole: parsed.data.targetRole,
      jobDescription: parsed.data.jobDescription,
      resumeFileName: resumeUpload.fileName,
      resumeUrl: resumeUpload.resumeUrl,
    });

    return {
      success: true,
      checkId: result.id,
      atsScore: result.atsScore ?? undefined,
      grade: result.grade ?? undefined,
      result: result.result ?? undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not run ATS resume check.";
    return { error: message };
  }
}
