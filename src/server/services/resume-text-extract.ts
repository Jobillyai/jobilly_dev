import "server-only";

import { createAdminClient } from "@/server/db/supabase-admin";

const MAX_RESUME_TEXT_CHARS = 50_000;

function toUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function parsePdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: toUint8Array(buffer) });

  try {
    const parsed = await parser.getText();
    return parsed.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function parseDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const parsed = await mammoth.extractRawText({ buffer });
  return parsed.value ?? "";
}

export async function extractResumeTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  let text = "";

  if (contentType === "application/pdf" || extension === "pdf") {
    text = await parsePdfText(buffer);
  } else if (
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    text = await parseDocxText(buffer);
  } else if (contentType === "application/msword" || extension === "doc") {
    throw new Error("Legacy .doc files are not supported. Upload PDF or .docx.");
  } else {
    throw new Error("Unsupported resume format. Upload PDF or .docx.");
  }

  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    throw new Error("Could not extract text from this resume. Try a different PDF or Word file.");
  }

  return normalized.slice(0, MAX_RESUME_TEXT_CHARS);
}

export async function downloadResumeBuffer(
  storagePath: string,
): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("resumes").download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not download resume from storage.");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const fileName = storagePath.split("/").pop() ?? "resume.pdf";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "pdf";

  const contentType =
    extension === "pdf"
      ? "application/pdf"
      : extension === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream";

  return { buffer, fileName, contentType };
}

export function countResumeWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
