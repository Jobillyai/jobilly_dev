import { readFileSync } from "node:fs";
import { join } from "node:path";

export const EMAIL_LOGO_CID = "jobilly-logo";

/** Display size in HTML (PNG is ~2x for retina; stacked arrow + wordmark lockup). */
export const EMAIL_LOGO_WIDTH = 99;
export const EMAIL_LOGO_HEIGHT = 72;

/** Smaller logo for email footers — same aspect ratio. */
export const EMAIL_LOGO_FOOTER_WIDTH = 71;
export const EMAIL_LOGO_FOOTER_HEIGHT = 52;

const LOGO_FILENAME = "jobilly-email-logo.png";

export function getCandidateInviteLogoAttachment() {
  try {
    const logoPath = join(process.cwd(), "public/brand", LOGO_FILENAME);
    const content = readFileSync(logoPath).toString("base64");

    return {
      filename: LOGO_FILENAME,
      content,
      contentId: EMAIL_LOGO_CID,
    };
  } catch {
    return null;
  }
}

function emailLogoFallbackHtml(): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;letter-spacing:-0.04em;line-height:1.2;white-space:nowrap;"><span style="color:#5170ff;">Jobilly</span><span style="color:#38b6ff;">.ai</span></div>`;
}

export function buildEmailLogoHtml(
  hasLogo: boolean,
  size: "header" | "footer" = "header",
): string {
  if (!hasLogo) {
    return emailLogoFallbackHtml();
  }

  const width = size === "footer" ? EMAIL_LOGO_FOOTER_WIDTH : EMAIL_LOGO_WIDTH;
  const height = size === "footer" ? EMAIL_LOGO_FOOTER_HEIGHT : EMAIL_LOGO_HEIGHT;

  return `<img src="cid:${EMAIL_LOGO_CID}" alt="Jobilly.AI" width="${width}" height="${height}" style="display:block;border:0;outline:none;text-decoration:none;background:transparent;" />`;
}
