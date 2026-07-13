import { createAdminClient } from "@/server/db/supabase-admin";
import {
  getFreshCandidateResumeUrl,
  saveCandidateResumeFile,
} from "@/server/services/resume-storage";
import {
  countResumeWords,
  downloadResumeBuffer,
  extractResumeTextFromBuffer,
} from "@/server/services/resume-text-extract";

export type CandidateResumeAnalysis = {
  fileName: string;
  downloadUrl: string;
  resumeText: string;
  wordCount: number;
};

async function persistAnalyzedResumeText(
  candidateId: string,
  resumeText: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("candidate_profiles").upsert(
    {
      user_id: candidateId,
      analyzed_resume_text: resumeText,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function analyzeCandidateResumeBuffer(input: {
  candidateId: string;
  fileBuffer: Buffer;
  fileName: string;
  contentType: string;
  interestedRole?: string | null;
  saveToProfile?: boolean;
}): Promise<CandidateResumeAnalysis> {
  const resumeText = await extractResumeTextFromBuffer(
    input.fileBuffer,
    input.fileName,
    input.contentType,
  );

  await persistAnalyzedResumeText(input.candidateId, resumeText);

  let downloadUrl: string;
  let fileName = input.fileName;

  if (input.saveToProfile !== false) {
    const saved = await saveCandidateResumeFile({
      userId: input.candidateId,
      fileName: input.fileName,
      fileBuffer: input.fileBuffer,
      contentType: input.contentType,
    });
    downloadUrl = saved.resumeUrl;
  } else {
    const existing = await getFreshCandidateResumeUrl(input.candidateId);
    if (!existing) {
      throw new Error("No resume on file to analyze.");
    }
    downloadUrl = existing.resumeUrl;
    fileName = existing.fileName;
  }

  return {
    fileName,
    downloadUrl,
    resumeText,
    wordCount: countResumeWords(resumeText),
  };
}

export async function analyzeCandidateResumeOnFile(input: {
  candidateId: string;
  interestedRole?: string | null;
}): Promise<CandidateResumeAnalysis> {
  const freshResume = await getFreshCandidateResumeUrl(input.candidateId);
  if (!freshResume) {
    throw new Error("No resume on file. Upload a PDF or Word resume first.");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("candidate_profiles")
    .select("resume_url")
    .eq("user_id", input.candidateId)
    .maybeSingle();

  const storagePath = profile?.resume_url;
  if (!storagePath || storagePath.startsWith("http")) {
    throw new Error("Could not locate the stored resume file.");
  }

  const downloaded = await downloadResumeBuffer(storagePath);
  const resumeText = await extractResumeTextFromBuffer(
    downloaded.buffer,
    downloaded.fileName,
    downloaded.contentType,
  );

  await persistAnalyzedResumeText(input.candidateId, resumeText);

  return {
    fileName: freshResume.fileName,
    downloadUrl: freshResume.resumeUrl,
    resumeText,
    wordCount: countResumeWords(resumeText),
  };
}
