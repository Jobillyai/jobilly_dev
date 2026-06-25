import { createClient } from "@/server/db/supabase-server";
import { createAdminClient } from "@/server/db/supabase-admin";
import {
  extractCustomKeywords,
  RESUME_MIME_TYPES,
  runApifyAtsScoreCheck,
  type AtsScoreResult,
  type AtsTargetRole,
} from "@/server/services/apify-ats-score";

export type ResumeAtsCheck = {
  id: string;
  targetRole: string;
  jobDescription: string | null;
  resumeText: string;
  resumeUrl: string | null;
  atsScore: number | null;
  grade: string | null;
  result: AtsScoreResult | null;
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

export type CandidateResumeContext = {
  hasStoredResume: boolean;
  resumePreviewUrl: string | null;
  education: string | null;
  careerGoals: string | null;
  skills: string[];
};

const RESUME_SIGNED_URL_TTL_SECONDS = 60 * 60;
const RESUME_EXTENSIONS = ["pdf", "docx", "doc"] as const;

function mapRow(row: {
  id: string;
  target_role: string;
  job_description: string | null;
  resume_text: string;
  resume_url: string | null;
  ats_score: number | null;
  grade: string | null;
  result_json: AtsScoreResult | Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}): ResumeAtsCheck {
  const resultJson = row.result_json as AtsScoreResult;

  return {
    id: row.id,
    targetRole: row.target_role,
    jobDescription: row.job_description,
    resumeText: row.resume_text,
    resumeUrl: row.resume_url,
    atsScore: row.ats_score,
    grade: row.grade,
    result:
      row.status === "completed" && resultJson?.atsScore !== undefined
        ? resultJson
        : null,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

async function resolveResumeStoragePath(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  storedValue: string | null,
): Promise<string | null> {
  if (storedValue && !storedValue.startsWith("http")) {
    return storedValue;
  }

  const { data: files } = await admin.storage.from("resumes").list(userId);
  if (!files?.length) {
    return null;
  }

  for (const extension of RESUME_EXTENSIONS) {
    const fileName = `base-resume.${extension}`;
    if (files.some((file) => file.name === fileName)) {
      return `${userId}/${fileName}`;
    }
  }

  return null;
}

export async function getFreshCandidateResumeUrl(
  userId: string,
): Promise<{ resumeUrl: string; fileName: string } | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("candidate_profiles")
    .select("resume_url")
    .eq("user_id", userId)
    .maybeSingle();

  const storagePath = await resolveResumeStoragePath(
    admin,
    userId,
    profile?.resume_url ?? null,
  );

  if (!storagePath) {
    return null;
  }

  const { data: signedData, error: signedError } = await admin.storage
    .from("resumes")
    .createSignedUrl(storagePath, RESUME_SIGNED_URL_TTL_SECONDS);

  if (signedError || !signedData?.signedUrl) {
    return null;
  }

  const fileName = storagePath.split("/").pop() ?? "resume.pdf";

  return {
    resumeUrl: signedData.signedUrl,
    fileName,
  };
}

export async function getCandidateResumeContext(
  userId: string,
): Promise<CandidateResumeContext> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("candidate_profiles")
    .select("resume_url, education, career_goals, skills")
    .eq("user_id", userId)
    .maybeSingle();

  const freshResume = await getFreshCandidateResumeUrl(userId);

  return {
    hasStoredResume: Boolean(data?.resume_url) || Boolean(freshResume),
    resumePreviewUrl: freshResume?.resumeUrl ?? null,
    education: data?.education ?? null,
    careerGoals: data?.career_goals ?? null,
    skills: data?.skills ?? [],
  };
}

export async function listResumeAtsChecks(userId: string): Promise<ResumeAtsCheck[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resume_ats_checks")
    .select("*")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function createResumeAtsCheck(input: {
  userId: string;
  targetRole: AtsTargetRole;
  jobDescription?: string;
  resumeFileName: string;
  resumeUrl: string;
}): Promise<ResumeAtsCheck> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const customKeywords = input.jobDescription
    ? extractCustomKeywords(input.jobDescription)
    : undefined;

  const { data: created, error: insertError } = await supabase
    .from("resume_ats_checks")
    .insert({
      candidate_id: input.userId,
      target_role: input.targetRole,
      job_description: input.jobDescription || null,
      resume_text: input.resumeFileName,
      resume_url: input.resumeUrl,
      status: "processing",
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "Could not save ATS check.");
  }

  const apifyResult = await runApifyAtsScoreCheck({
    resumeUrl: input.resumeUrl,
    targetRole: input.targetRole,
    customKeywords,
  });

  if ("error" in apifyResult) {
    const { data: failed, error: failUpdateError } = await admin
      .from("resume_ats_checks")
      .update({
        status: "failed",
        error_message: apifyResult.error,
        updated_at: new Date().toISOString(),
      })
      .eq("id", created.id)
      .select("*")
      .single();

    if (failUpdateError || !failed) {
      throw new Error(failUpdateError?.message ?? apifyResult.error);
    }

    throw new Error(apifyResult.error);
  }

  const { result } = apifyResult;

  const { data: updated, error: updateError } = await admin
    .from("resume_ats_checks")
    .update({
      ats_score: result.atsScore,
      grade: result.grade,
      result_json: result,
      status: "completed",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", created.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Could not save ATS score.");
  }

  return mapRow(updated);
}

export async function saveCandidateResumeFile(input: {
  userId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<{ resumeUrl: string }> {
  const admin = createAdminClient();

  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    throw new Error(listError.message);
  }

  if (!buckets?.some((bucket) => bucket.name === "resumes")) {
    const { error: createError } = await admin.storage.createBucket("resumes", {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [...RESUME_MIME_TYPES],
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(createError.message);
    }
  }

  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${input.userId}/base-resume.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("resumes")
    .upload(path, input.fileBuffer, {
      upsert: true,
      contentType: input.contentType,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: signedData, error: signedError } = await admin.storage
    .from("resumes")
    .createSignedUrl(path, RESUME_SIGNED_URL_TTL_SECONDS);

  if (signedError || !signedData?.signedUrl) {
    throw new Error(signedError?.message ?? "Could not create resume download link.");
  }

  await admin.from("candidate_profiles").upsert(
    {
      user_id: input.userId,
      resume_url: path,
    },
    { onConflict: "user_id" },
  );

  return { resumeUrl: signedData.signedUrl };
}
