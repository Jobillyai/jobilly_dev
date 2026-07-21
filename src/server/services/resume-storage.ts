import { createHash } from "crypto";
import { createAdminClient } from "@/server/db/supabase-admin";
import {
  normalizeStorageContentType,
  RESUME_MIME_TYPES,
} from "@/lib/resume-mime";

const RESUME_SIGNED_URL_TTL_SECONDS = 60 * 60;
const RESUME_EXTENSIONS = ["pdf", "docx", "doc"] as const;

function contentTypeForFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === "doc") {
    return "application/msword";
  }
  if (extension === "txt") {
    return "text/plain";
  }
  return "application/pdf";
}

async function ensureResumesBucket(
  admin: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) {
    throw new Error(listError.message);
  }

  const allowedMimeTypes = [...RESUME_MIME_TYPES];
  const exists = buckets?.some((bucket) => bucket.name === "resumes");

  if (!exists) {
    const { error: createError } = await admin.storage.createBucket("resumes", {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes,
    });
    if (
      createError &&
      !createError.message.toLowerCase().includes("already exists")
    ) {
      throw new Error(createError.message);
    }
    return;
  }

  // Existing buckets keep the old PDF/DOCX-only allowlist — refresh so TXT overrides work.
  const { error: updateError } = await admin.storage.updateBucket("resumes", {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes,
  });
  if (updateError) {
    console.error("Could not update resumes bucket MIME allowlist:", updateError.message);
  }
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

export async function getCandidateResumeFile(
  userId: string,
): Promise<{
  storagePath: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
} | null> {
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
  if (!storagePath) return null;

  const { data, error } = await admin.storage.from("resumes").download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "Could not download the candidate resume.");
  }
  const fileName = storagePath.split("/").pop() ?? "base-resume.pdf";
  return {
    storagePath,
    fileName,
    fileBuffer: Buffer.from(await data.arrayBuffer()),
    contentType: data.type || contentTypeForFileName(fileName),
  };
}

export async function saveCandidateResumeFile(input: {
  userId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<{ resumeUrl: string; storagePath: string }> {
  const admin = createAdminClient();
  await ensureResumesBucket(admin);

  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `${input.userId}/base-resume.${extension}`;
  const contentType = normalizeStorageContentType(
    input.contentType || contentTypeForFileName(input.fileName),
  );

  // Remove other extension variants so an old PDF cannot shadow a new DOCX (or vice versa).
  const stalePaths = RESUME_EXTENSIONS.filter((ext) => ext !== extension).map(
    (ext) => `${input.userId}/base-resume.${ext}`,
  );
  if (stalePaths.length) {
    await admin.storage.from("resumes").remove(stalePaths);
  }

  const { error: uploadError } = await admin.storage
    .from("resumes")
    .upload(path, Buffer.from(input.fileBuffer), {
      upsert: true,
      contentType,
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

  return { resumeUrl: signedData.signedUrl, storagePath: path };
}

export async function createSignedResumeUrl(
  storagePath: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("resumes")
    .createSignedUrl(storagePath, RESUME_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function saveApplicationResumeFile(input: {
  candidateId: string;
  jobId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<{ storagePath: string; fileName: string }> {
  const admin = createAdminClient();
  await ensureResumesBucket(admin);

  const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const safeName =
    input.fileName.replace(/[^\w.-]/g, "_").slice(0, 120) || `resume.${extension}`;
  const path = `${input.candidateId}/applications/${input.jobId}/${safeName}`;
  const contentType = normalizeStorageContentType(
    input.contentType || contentTypeForFileName(input.fileName),
  );

  const { error: uploadError } = await admin.storage
    .from("resumes")
    .upload(path, Buffer.from(input.fileBuffer), {
      upsert: true,
      contentType,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return { storagePath: path, fileName: input.fileName };
}

/** Upload admin TXT override bytes into the resumes bucket. */
export async function saveResumeTxtOverrideFile(input: {
  candidateId: string;
  fileName: string;
  fileBuffer: Buffer;
}): Promise<string> {
  const admin = createAdminClient();
  await ensureResumesBucket(admin);

  const digest = createHash("sha256")
    .update(input.fileBuffer)
    .digest("hex")
    .slice(0, 16);
  const path = `${input.candidateId}/resume-intelligence/admin-override-${digest}.txt`;

  const { error } = await admin.storage.from("resumes").upload(path, Buffer.from(input.fileBuffer), {
    upsert: true,
    contentType: "text/plain",
  });
  if (error) {
    throw new Error(error.message);
  }
  return path;
}
