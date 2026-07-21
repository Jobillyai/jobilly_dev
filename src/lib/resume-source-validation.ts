import {
  contentTypeForResumeKind,
  detectResumeFileKind,
  type ResumeFileKind,
} from "@/lib/resume-mime";

export function validateBaseResumeFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): ResumeFileKind {
  return detectResumeFileKind(buffer, fileName, contentType);
}

export function resolveBaseResumeContentType(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): { kind: ResumeFileKind; contentType: string } {
  const kind = detectResumeFileKind(buffer, fileName, contentType);
  return { kind, contentType: contentTypeForResumeKind(kind) };
}

export function validateTxtOverride(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): string {
  if (!buffer.length || buffer.length > 1024 * 1024) {
    throw new Error("TXT override must be between 1 byte and 1 MB.");
  }
  const mime = (contentType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (
    !fileName.toLowerCase().endsWith(".txt") ||
    (mime &&
      mime !== "text/plain" &&
      mime !== "application/octet-stream")
  ) {
    throw new Error("Upload a UTF-8 .txt file.");
  }
  if (buffer.includes(0)) throw new Error("Binary TXT files are not accepted.");
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer).trim();
  } catch {
    throw new Error("TXT override must contain valid UTF-8 text.");
  }
  if (text.length < 40) throw new Error("TXT override is too short to analyze.");
  return text;
}
