export const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Admin TXT overrides + browsers that mis-label files
  "text/plain",
  "application/octet-stream",
] as const;

export type ResumeFileKind = "pdf" | "docx";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function contentTypeForResumeKind(kind: ResumeFileKind): string {
  return kind === "pdf" ? PDF_MIME : DOCX_MIME;
}

/** Strip parameters like `; charset=utf-8` — Supabase matches the base type strictly. */
export function normalizeStorageContentType(contentType: string): string {
  const base = contentType.split(";")[0]?.trim().toLowerCase() || "";
  if (!base || base === "application/octet-stream") {
    return base || "application/octet-stream";
  }
  if (base === "text/plain") return "text/plain";
  if (base === "application/pdf" || base === "application/x-pdf") {
    return PDF_MIME;
  }
  if (base.includes("wordprocessingml") || base === "application/msword") {
    return base.includes("wordprocessingml") ? DOCX_MIME : "application/msword";
  }
  return base;
}

/**
 * Browsers (especially Windows) often send "" or application/octet-stream.
 * Trust magic bytes + extension, not the declared MIME alone.
 */
export function detectResumeFileKind(
  buffer: Buffer,
  fileName: string,
  contentType = "",
): ResumeFileKind {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = normalizeStorageContentType(contentType);
  const head = buffer.subarray(0, 8);
  const isPdfMagic = head.subarray(0, 5).toString("ascii") === "%PDF-";
  const isZipMagic = head.subarray(0, 2).toString("ascii") === "PK";

  if (
    isPdfMagic &&
    (extension === "pdf" || mime === PDF_MIME || mime === "application/x-pdf" || !extension)
  ) {
    return "pdf";
  }

  if (
    isZipMagic &&
    (extension === "docx" ||
      mime.includes("wordprocessingml") ||
      mime === "application/octet-stream" ||
      mime === "" ||
      mime === "text/plain")
  ) {
    if (extension === "docx" || mime.includes("wordprocessingml") || isZipMagic) {
      if (extension === "docx" || mime.includes("wordprocessingml")) {
        return "docx";
      }
    }
  }

  if (extension === "pdf" && isPdfMagic) return "pdf";
  if (extension === "docx" && isZipMagic) return "docx";

  throw new Error(
    "Resume replace accepts genuine PDF or DOCX files only. Re-save the file as .pdf or .docx and try again.",
  );
}
