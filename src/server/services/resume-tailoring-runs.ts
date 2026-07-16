import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { tailoredResumeSchema, type TailoredResume } from "@/lib/resume-tailoring";
import { createAdminClient } from "@/server/db/supabase-admin";
import { extractResumeTextFromBuffer } from "@/server/services/resume-text-extract";
import {
  generateTailoredResume,
  RESUME_TAILORING_PROMPT_VERSION,
} from "@/server/services/gemini-resume-tailoring";
import {
  buildTailoredResumeDocx,
  buildTailoredResumePdf,
  TAILORED_RESUME_DOCX_MIME,
  TAILORED_RESUME_PDF_MIME,
} from "@/server/services/resume-document-renderer";
import {
  createSignedResumeUrl,
  getCandidateResumeFile,
  removeResumeTailoringRunFiles,
  saveResumeTailoringRunFile,
} from "@/server/services/resume-storage";
import type { Database } from "@/server/db/database.types";

type TailoringRow = Database["public"]["Tables"]["resume_tailoring_runs"]["Row"];
export type TailoringStatus = TailoringRow["status"];

export type ResumeTailoringRun = {
  id: string;
  candidateId: string;
  jobId: string;
  status: TailoringStatus;
  atsScore: number | null;
  result: TailoredResume | null;
  model: string | null;
  errorMessage: string | null;
  docxFileName: string | null;
  pdfFileName: string | null;
  docxDownloadUrl: string | null;
  pdfDownloadUrl: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function safeBaseName(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w -]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80) || "Candidate"
  );
}

async function mapRun(row: TailoringRow): Promise<ResumeTailoringRun> {
  const parsed = tailoredResumeSchema.safeParse(row.result_json);
  const [docxDownloadUrl, pdfDownloadUrl] = await Promise.all([
    row.generated_docx_path ? createSignedResumeUrl(row.generated_docx_path) : null,
    row.generated_pdf_path ? createSignedResumeUrl(row.generated_pdf_path) : null,
  ]);
  return {
    id: row.id,
    candidateId: row.candidate_id,
    jobId: row.scraped_job_id,
    status: row.status,
    atsScore: row.ats_score,
    result: parsed.success ? parsed.data : null,
    model: row.model,
    errorMessage: row.error_message,
    docxFileName: row.generated_docx_file_name,
    pdfFileName: row.generated_pdf_file_name,
    docxDownloadUrl,
    pdfDownloadUrl,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLatestResumeTailoringRun(
  candidateId: string,
  jobId: string,
): Promise<ResumeTailoringRun | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("resume_tailoring_runs")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("scraped_job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapRun(data) : null;
}

export async function generateResumeTailoringRun(input: {
  candidateId: string;
  jobId: string;
  createdBy: string;
  candidateName: string;
  targetRole?: string | null;
}): Promise<{ run: ResumeTailoringRun } | { error: string }> {
  const admin = createAdminClient();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: job, error: jobError }, { count: dailyCount }] = await Promise.all([
    admin
      .from("scraped_jobs")
      .select("id, candidate_id, company, role, jd_text")
      .eq("id", input.jobId)
      .eq("candidate_id", input.candidateId)
      .maybeSingle(),
    admin
      .from("resume_tailoring_runs")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", input.candidateId)
      .gte("created_at", dayAgo),
  ]);

  if (jobError || !job) return { error: "Job listing not found." };
  if (!job.jd_text?.trim()) return { error: "This job does not have a usable job description." };
  if ((dailyCount ?? 0) >= 5) {
    return { error: "This candidate has reached the limit of 5 tailoring runs in 24 hours." };
  }

  let source;
  try {
    source = await getCandidateResumeFile(input.candidateId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not load the base resume." };
  }
  if (!source) return { error: "Upload a candidate base resume before tailoring." };
  if (source.fileName.toLowerCase().endsWith(".doc")) {
    return { error: "Legacy .doc resumes cannot be tailored. Upload PDF or DOCX." };
  }

  const runId = randomUUID();
  const sourceHash = createHash("sha256").update(source.fileBuffer).digest("hex");
  let sourceSnapshotPath: string;
  try {
    sourceSnapshotPath = await saveResumeTailoringRunFile({
      candidateId: input.candidateId,
      jobId: input.jobId,
      runId,
      fileName: `source-${source.fileName}`,
      fileBuffer: source.fileBuffer,
      contentType: source.contentType,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not snapshot the resume." };
  }

  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("resume_tailoring_runs").insert({
    id: runId,
    candidate_id: input.candidateId,
    scraped_job_id: input.jobId,
    created_by: input.createdBy,
    status: "generating",
    source_resume_path: sourceSnapshotPath,
    source_resume_file_name: source.fileName,
    source_resume_sha256: sourceHash,
    job_description_snapshot: job.jd_text,
    prompt_version: RESUME_TAILORING_PROMPT_VERSION,
    updated_at: now,
  });
  if (insertError) {
    await removeResumeTailoringRunFiles([sourceSnapshotPath]).catch(() => undefined);
    return {
      error: insertError.code === "23505"
        ? "A resume is already being generated for this job."
        : insertError.message,
    };
  }

  const generatedPaths: string[] = [];
  try {
    const sourceText = await extractResumeTextFromBuffer(
      source.fileBuffer,
      source.fileName,
      source.contentType,
    );
    const generation = await generateTailoredResume({
      sourceResumeText: sourceText,
      jobDescription: job.jd_text,
      candidateTargetRole: input.targetRole || job.role,
    });
    if ("error" in generation) throw new Error(generation.error);

    const [docx, pdf] = await Promise.all([
      buildTailoredResumeDocx(generation.resume),
      buildTailoredResumePdf(generation.resume),
    ]);
    const fileBase =
      `${safeBaseName(input.candidateName)}_${safeBaseName(job.role)}_Tailored`;
    const docxFileName = `${fileBase}.docx`;
    const pdfFileName = `${fileBase}.pdf`;
    const docxPath = await saveResumeTailoringRunFile({
      candidateId: input.candidateId,
      jobId: input.jobId,
      runId,
      fileName: docxFileName,
      fileBuffer: docx,
      contentType: TAILORED_RESUME_DOCX_MIME,
    });
    generatedPaths.push(docxPath);
    const pdfPath = await saveResumeTailoringRunFile({
      candidateId: input.candidateId,
      jobId: input.jobId,
      runId,
      fileName: pdfFileName,
      fileBuffer: pdf,
      contentType: TAILORED_RESUME_PDF_MIME,
    });
    generatedPaths.push(pdfPath);

    const { data: completed, error: updateError } = await admin
      .from("resume_tailoring_runs")
      .update({
        status: "review_required",
        model: generation.model,
        result_json: generation.resume as unknown as Record<string, unknown>,
        ats_score: generation.atsScore,
        generated_docx_path: docxPath,
        generated_pdf_path: pdfPath,
        generated_docx_file_name: docxFileName,
        generated_pdf_file_name: pdfFileName,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .select("*")
      .single();
    if (updateError || !completed) {
      throw new Error(updateError?.message ?? "Could not save the generated resume.");
    }
    return { run: await mapRun(completed) };
  } catch (error) {
    if (generatedPaths.length > 0) {
      await removeResumeTailoringRunFiles(generatedPaths).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Resume tailoring failed.";
    await admin
      .from("resume_tailoring_runs")
      .update({
        status: "failed",
        error_message: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return { error: message };
  }
}

export async function approveResumeTailoringRun(input: {
  runId: string;
  candidateId: string;
  jobId: string;
  approvedBy: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data: run } = await admin
    .from("resume_tailoring_runs")
    .select("id")
    .eq("id", input.runId)
    .eq("candidate_id", input.candidateId)
    .eq("scraped_job_id", input.jobId)
    .eq("status", "review_required")
    .maybeSingle();
  if (!run) return false;

  const { data, error } = await admin.rpc("approve_resume_tailoring_run", {
    p_run_id: input.runId,
    p_approved_by: input.approvedBy,
  });
  return !error && data === true;
}
