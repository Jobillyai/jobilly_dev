import "server-only";
import { createHash, randomUUID } from "crypto";
import {
  JOB_CLASSIFIER_VERSION,
  JOB_TAXONOMY_VERSION,
  type JobCategoryId,
  type StrictJobIntent,
} from "@/lib/job-category-taxonomy";
import { mergeResumeSkillsIntoSearchKeywords } from "@/lib/job-keyword-match";
import { createAdminClient } from "@/server/db/supabase-admin";
import { extractResumeTextFromBuffer } from "@/server/services/resume-text-extract";
import { saveResumeTxtOverrideFile } from "@/server/services/resume-storage";
import {
  classifyResumeIntent,
  RESUME_INTELLIGENCE_PROMPT_VERSION,
  RESUME_INTELLIGENCE_SCHEMA_VERSION,
} from "@/server/services/gemini-resume-intelligence";
import {
  validateBaseResumeFile,
  validateTxtOverride,
} from "@/lib/resume-source-validation";

export {
  validateBaseResumeFile,
  validateTxtOverride,
  resolveBaseResumeContentType,
} from "@/lib/resume-source-validation";

/** Bumped when extraction normalization changes so fingerprints invalidate. */
export const RESUME_PARSER_VERSION = "2026-07-v2";

type SourceKind = "base_resume" | "admin_txt_override";

const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");

async function audit(
  actorId: string | null,
  action: string,
  candidateId: string,
) {
  await createAdminClient().from("audit_log").insert({
    actor_user_id: actorId,
    action,
    target: `candidate:${candidateId}:resume-intelligence`,
  });
}

async function syncAnalyzedResumeText(
  candidateId: string,
  extractedText: string,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("candidate_profiles")
    .update({
      analyzed_resume_text: extractedText,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", candidateId);
  if (error) {
    console.error("Failed to sync analyzed_resume_text:", error.message);
  }
}

async function clearAdminTxtOverrideSource(candidateId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("candidate_resume_sources")
    .select("storage_path")
    .eq("candidate_id", candidateId)
    .eq("source_kind", "admin_txt_override")
    .maybeSingle();

  if (data?.storage_path?.startsWith(`${candidateId}/`)) {
    await admin.storage.from("resumes").remove([data.storage_path]);
  }

  const { error } = await admin
    .from("candidate_resume_sources")
    .delete()
    .eq("candidate_id", candidateId)
    .eq("source_kind", "admin_txt_override");
  if (error) throw new Error(error.message);
}

async function upsertSource(input: {
  candidateId: string;
  actorId: string;
  sourceKind: SourceKind;
  storagePath: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
  extractedText: string;
  byteSize?: number;
  sha256?: string;
}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const byteSize = input.byteSize ?? input.buffer.byteLength ?? input.buffer.length;
  if (!byteSize || byteSize <= 0) {
    throw new Error(
      "Resume file bytes were empty after upload. Try Replace base resume again with the PDF/DOCX file.",
    );
  }
  const { error } = await admin.from("candidate_resume_sources").upsert(
    {
      candidate_id: input.candidateId,
      source_kind: input.sourceKind,
      storage_path: input.storagePath,
      original_file_name: input.fileName,
      canonical_mime: input.contentType,
      byte_size: byteSize,
      sha256: input.sha256 ?? hash(input.buffer),
      extracted_text: input.extractedText,
      parser_version: RESUME_PARSER_VERSION,
      extraction_status: "completed",
      error_message: null,
      uploaded_by: input.actorId,
      extracted_at: now,
      updated_at: now,
    },
    { onConflict: "candidate_id,source_kind" },
  );
  if (error) throw new Error(error.message);
}

export async function registerBaseResumeForIntelligence(input: {
  candidateId: string;
  actorId: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  // Copy first — storage upload / PDF parsers can detach the original ArrayBuffer
  // which makes buffer.length become 0 and breaks the byte_size > 0 check.
  const buffer = Buffer.from(input.buffer);
  if (!buffer.byteLength) {
    throw new Error(
      "Uploaded resume was empty. Choose the Lokesh PDF/DOCX again and replace the base resume.",
    );
  }
  validateBaseResumeFile(buffer, input.fileName, input.contentType);
  const byteSize = buffer.byteLength;
  const sha256 = hash(buffer);
  const text = await extractResumeTextFromBuffer(
    Buffer.from(buffer),
    input.fileName,
    input.contentType,
  );

  // A new base resume must become the active source — drop any stale TXT override
  // that would otherwise keep analysis locked to the previous person's resume.
  await clearAdminTxtOverrideSource(input.candidateId);

  await upsertSource({
    candidateId: input.candidateId,
    actorId: input.actorId,
    sourceKind: "base_resume",
    storagePath: input.storagePath,
    fileName: input.fileName,
    contentType: input.contentType,
    buffer,
    extractedText: text,
    byteSize,
    sha256,
  });
  await syncAnalyzedResumeText(input.candidateId, text);
  await audit(input.actorId, "resume_source_base_updated", input.candidateId);

  // Classify THIS buffer's text only — do not re-read a possibly stale DB row,
  // and do not bias Gemini with the previous person's job_search_role.
  return invalidateAndAnalyzeResume(input.candidateId, {
    force: true,
    ignoreProfileRole: true,
    resumeText: text,
    sourceKind: "base_resume",
    uploadedBy: input.actorId,
    fileSha256: sha256,
  });
}

export async function saveAdminTxtOverride(input: {
  candidateId: string;
  actorId: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  const buffer = Buffer.from(input.buffer);
  const text = validateTxtOverride(buffer, input.fileName, input.contentType);
  const byteSize = buffer.byteLength;
  const sha256 = hash(buffer);
  const path = await saveResumeTxtOverrideFile({
    candidateId: input.candidateId,
    fileName: input.fileName,
    fileBuffer: Buffer.from(buffer),
  });

  await upsertSource({
    candidateId: input.candidateId,
    actorId: input.actorId,
    sourceKind: "admin_txt_override",
    storagePath: path,
    fileName: input.fileName,
    contentType: "text/plain",
    buffer,
    extractedText: text,
    byteSize,
    sha256,
  });
  await syncAnalyzedResumeText(input.candidateId, text);
  await audit(
    input.actorId,
    "resume_source_txt_override_updated",
    input.candidateId,
  );
  return invalidateAndAnalyzeResume(input.candidateId, {
    force: true,
    ignoreProfileRole: true,
    resumeText: text,
    sourceKind: "admin_txt_override",
    uploadedBy: input.actorId,
    fileSha256: sha256,
  });
}

export async function removeAdminTxtOverride(
  candidateId: string,
  actorId?: string,
) {
  await clearAdminTxtOverrideSource(candidateId);
  await audit(
    actorId ?? null,
    "resume_source_txt_override_removed",
    candidateId,
  );
  return invalidateAndAnalyzeResume(candidateId, {
    force: true,
    ignoreProfileRole: true,
  });
}

export async function invalidateAndAnalyzeResume(
  candidateId: string,
  options?: {
    force?: boolean;
    ignoreProfileRole?: boolean;
    /** Fresh text from the upload buffer — preferred over a DB re-read. */
    resumeText?: string;
    sourceKind?: SourceKind;
    uploadedBy?: string | null;
    fileSha256?: string;
  },
) {
  const admin = createAdminClient();
  const force = options?.force === true;
  const { data: sources, error } = await admin
    .from("candidate_resume_sources")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("extraction_status", "completed");
  if (error) throw new Error(error.message);

  const source =
    sources?.find((row) => row.source_kind === "admin_txt_override") ??
    sources?.find((row) => row.source_kind === "base_resume");

  const resumeText = (options?.resumeText ?? source?.extracted_text ?? "").trim();
  if (!resumeText) {
    throw new Error("No analyzed PDF, DOCX, or TXT resume source exists.");
  }

  const effectiveSourceKind =
    options?.sourceKind ??
    source?.source_kind ??
    ("base_resume" as SourceKind);
  const uploadedBy =
    options?.uploadedBy ?? source?.uploaded_by ?? null;
  const fileSha256 = options?.fileSha256 ?? source?.sha256 ?? hash(resumeText);
  const parserVersion = source?.parser_version ?? RESUME_PARSER_VERSION;

  await syncAnalyzedResumeText(candidateId, resumeText);

  // Drop previous person's search role before classifying a new resume.
  if (options?.ignoreProfileRole) {
    await admin
      .from("candidate_profiles")
      .update({
        job_search_role: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", candidateId);
  }

  const textFingerprint = hash(resumeText);
  const fingerprint = hash(
    [
      fileSha256,
      textFingerprint,
      parserVersion,
      RESUME_INTELLIGENCE_PROMPT_VERSION,
      RESUME_INTELLIGENCE_SCHEMA_VERSION,
      JOB_TAXONOMY_VERSION,
    ].join(":"),
  );

  if (!force) {
    const { data: cached } = await admin
      .from("candidate_resume_analysis")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("source_fingerprint", fingerprint)
      .eq("status", "completed")
      .maybeSingle();

    if (cached) {
      if (
        !cached.category_confirmed_at &&
        cached.category_id &&
        cached.canonical_search_title
      ) {
        const confirmedAt = new Date().toISOString();
        const { data: confirmed } = await admin
          .from("candidate_resume_analysis")
          .update({
            category_confirmed_at: confirmedAt,
            category_confirmed_by: uploadedBy,
            updated_at: confirmedAt,
          })
          .eq("candidate_id", candidateId)
          .select("*")
          .single();
        return confirmed ?? cached;
      }
      return cached;
    }
  }

  // Hard reset — never leave the previous person's completed analysis visible.
  if (force) {
    await admin
      .from("candidate_resume_analysis")
      .delete()
      .eq("candidate_id", candidateId);
  }

  const token = randomUUID();
  const now = new Date().toISOString();
  const { error: pending } = await admin.from("candidate_resume_analysis").upsert(
    {
      candidate_id: candidateId,
      effective_source_kind: effectiveSourceKind,
      source_fingerprint: fingerprint,
      status: "processing",
      prompt_version: RESUME_INTELLIGENCE_PROMPT_VERSION,
      taxonomy_version: JOB_TAXONOMY_VERSION,
      generation_token: token,
      target_roles: [],
      responsibilities: [],
      skills: [],
      search_keywords: [],
      canonical_search_title: null,
      category_id: null,
      confidence: null,
      accepted_title_patterns: [],
      excluded_category_ids: [],
      result_json: null,
      model: null,
      analyzed_at: null,
      category_confirmed_at: null,
      category_confirmed_by: null,
      error_message: null,
      updated_at: now,
    },
    { onConflict: "candidate_id" },
  );
  if (pending) throw new Error(pending.message);

  try {
    let interestedRole: string | null = null;
    if (!options?.ignoreProfileRole) {
      const { data: profile } = await admin
        .from("candidate_profiles")
        .select("job_search_role")
        .eq("user_id", candidateId)
        .maybeSingle();
      interestedRole = profile?.job_search_role ?? null;
    }

    const result = await classifyResumeIntent({
      resumeText,
      interestedRole,
    });
    const analyzedAt = new Date().toISOString();
    const { data, error: updateError } = await admin
      .from("candidate_resume_analysis")
      .update({
        status: "completed",
        target_roles: result.targetRoles,
        responsibilities: result.responsibilities,
        skills: result.skills,
        search_keywords: result.searchKeywords,
        canonical_search_title: result.canonicalSearchTitle,
        category_id: result.categoryId,
        confidence: result.confidence,
        accepted_title_patterns: result.acceptedTitlePatterns,
        excluded_category_ids: result.excludedCategoryIds,
        result_json: result,
        model: result.model,
        category_confirmed_at: analyzedAt,
        category_confirmed_by: uploadedBy,
        analyzed_at: analyzedAt,
        error_message: null,
        updated_at: analyzedAt,
      })
      .eq("candidate_id", candidateId)
      .eq("generation_token", token)
      .select("*")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!data) {
      throw new Error(
        "Resume analysis was superseded by another upload. Retry analysis.",
      );
    }

    await admin
      .from("candidate_profiles")
      .update({
        job_search_role: result.canonicalSearchTitle,
        analyzed_resume_text: resumeText,
        updated_at: analyzedAt,
      })
      .eq("user_id", candidateId);

    await audit(uploadedBy, "resume_intelligence_analyzed", candidateId);
    return data;
  } catch (e) {
    await admin
      .from("candidate_resume_analysis")
      .update({
        status: "failed",
        error_message:
          e instanceof Error ? e.message : "Resume analysis failed.",
        updated_at: new Date().toISOString(),
      })
      .eq("candidate_id", candidateId)
      .eq("generation_token", token);
    throw e;
  }
}

export async function getResumeIntelligence(candidateId: string) {
  const admin = createAdminClient();
  const [{ data: sources }, { data: analysis }] = await Promise.all([
    admin
      .from("candidate_resume_sources")
      .select("*")
      .eq("candidate_id", candidateId),
    admin
      .from("candidate_resume_analysis")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle(),
  ]);
  return { sources: sources ?? [], analysis };
}

export async function getConfirmedStrictIntent(
  candidateId: string,
): Promise<StrictJobIntent> {
  const { data, error } = await createAdminClient()
    .from("candidate_resume_analysis")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("status", "completed")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.category_id || !data.canonical_search_title) {
    throw new Error(
      "Resume analysis must identify a job category and search title before scraping.",
    );
  }

  const searchKeywords = mergeResumeSkillsIntoSearchKeywords(
    data.skills,
    data.search_keywords,
  );

  return {
    canonicalSearchTitle: data.canonical_search_title,
    targetRoles: data.target_roles,
    categoryId: data.category_id as JobCategoryId,
    skills: data.skills,
    searchKeywords,
    acceptedTitlePatterns: data.accepted_title_patterns,
    excludedCategoryIds: data.excluded_category_ids as JobCategoryId[],
    intentFingerprint: hash(
      [
        data.source_fingerprint,
        data.category_id,
        data.canonical_search_title,
        data.target_roles.join("|"),
        data.skills.join("|"),
        searchKeywords.join("|"),
        JOB_CLASSIFIER_VERSION,
      ].join(":"),
    ),
  };
}
