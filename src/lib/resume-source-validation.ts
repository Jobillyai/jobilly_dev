export function validateBaseResumeFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): "pdf" | "docx" {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (
    extension === "pdf" &&
    contentType === "application/pdf" &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) return "pdf";
  if (
    extension === "docx" &&
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    buffer.subarray(0, 2).toString("ascii") === "PK"
  ) return "docx";
  throw new Error("Resume analysis accepts genuine PDF or DOCX files only.");
}

export function validateTxtOverride(
  buffer: Buffer,
  fileName: string,
  contentType: string,
): string {
  if (!buffer.length || buffer.length > 1024 * 1024) {
    throw new Error("TXT override must be between 1 byte and 1 MB.");
  }
  if (!fileName.toLowerCase().endsWith(".txt") || !["text/plain", ""].includes(contentType)) {
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
