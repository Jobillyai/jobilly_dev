import "server-only";

import { Resend } from "resend";
import type { PremiumPlanId } from "@/lib/candidate-services";
import {
  buildEmailLogoHtml,
  getCandidateInviteLogoAttachment,
} from "@/server/services/email-logo";

export type PaymentReceiptData = {
  subscriptionId: string;
  transactionReference: string;
  receiptNumber: string;
  candidateName: string;
  candidateEmail: string;
  billingPhone: string;
  billingAddress: string;
  planId: PremiumPlanId;
  planTitle: string;
  amountUsd: number;
  currency: string;
  paidAt: string;
};

function plainAscii(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string): string {
  return plainAscii(value).replace(/([\\()])/g, "\\$1");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function receiptLines(receipt: PaymentReceiptData): string[] {
  const paidAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(receipt.paidAt));

  return [
    "JOBILLY.AI",
    "PAYMENT ACKNOWLEDGEMENT",
    "",
    `Receipt: ${receipt.receiptNumber}`,
    `Transaction: ${receipt.transactionReference}`,
    `Payment date (UTC): ${paidAt}`,
    `Status: Successful (QA mock payment)`,
    "",
    `Candidate: ${receipt.candidateName}`,
    `Email: ${receipt.candidateEmail}`,
    `Phone: ${receipt.billingPhone}`,
    `Billing address: ${receipt.billingAddress}`,
    "",
    `Plan: ${receipt.planTitle}`,
    `Amount: ${receipt.currency} ${receipt.amountUsd.toFixed(2)}`,
    "",
    "This acknowledgement was generated for the Jobilly.ai QA mock checkout.",
    "No real card details were collected and no real charge was made.",
  ];
}

/** Generates a small, standards-compliant one-page PDF without a browser runtime. */
export function buildPaymentReceiptPdf(receipt: PaymentReceiptData): Buffer {
  const textCommands = receiptLines(receipt)
    .map((line, index) => {
      const size = index === 0 ? 20 : index === 1 ? 15 : 11;
      return `/F1 ${size} Tf (${escapePdfText(line)}) Tj T*`;
    })
    .join("\n");
  const stream = `BT\n50 760 Td\n16 TL\n${textCommands}\nET`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "ascii");
}

function buildReceiptHtml(receipt: PaymentReceiptData, hasLogo: boolean): string {
  const paidAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(receipt.paidAt));

  return `
<!doctype html>
<html>
  <body style="margin:0;background:#f0f6ff;padding:32px 16px;font-family:Arial,sans-serif;color:#0a1628;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #dbeafe;border-radius:20px;overflow:hidden;">
      <div style="padding:26px 30px 12px;">${buildEmailLogoHtml(hasLogo)}</div>
      <div style="padding:12px 30px 30px;">
        <p style="color:#5170ff;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Payment successful</p>
        <h1 style="font-size:27px;margin:0 0 12px;">Your ${escapeHtml(receipt.planTitle)} plan is active</h1>
        <p style="color:#475569;line-height:1.6;">Hi ${escapeHtml(receipt.candidateName)}, your QA mock payment was completed successfully. Your PDF acknowledgement is attached.</p>
        <div style="margin:24px 0;padding:18px;border-radius:14px;background:#f8fbff;border:1px solid #dbeafe;line-height:1.8;">
          <strong>Receipt:</strong> ${escapeHtml(receipt.receiptNumber)}<br>
          <strong>Transaction:</strong> ${escapeHtml(receipt.transactionReference)}<br>
          <strong>Plan:</strong> ${escapeHtml(receipt.planTitle)}<br>
          <strong>Amount:</strong> ${escapeHtml(receipt.currency)} ${receipt.amountUsd.toFixed(2)}<br>
          <strong>Date:</strong> ${escapeHtml(paidAt)} UTC
        </div>
        <p style="font-size:13px;color:#64748b;">QA notice: no real card details were collected and no real charge was made.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendPaymentReceiptEmail(
  receipt: PaymentReceiptData,
): Promise<{ sent: boolean; error?: string; devMode?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.log(
      `[payment-receipt] Dev mode: ${receipt.receiptNumber} for ${receipt.candidateEmail}`,
    );
    return { sent: true, devMode: true };
  }

  const logo = getCandidateInviteLogoAttachment();
  const pdf = buildPaymentReceiptPdf(receipt);
  const attachments = [
    {
      filename: `${receipt.receiptNumber}.pdf`,
      content: pdf.toString("base64"),
    },
    ...(logo ? [logo] : []),
  ];

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() ?? "Jobilly <onboarding@resend.dev>",
    to: [receipt.candidateEmail],
    subject: `Payment acknowledgement — ${receipt.planTitle}`,
    html: buildReceiptHtml(receipt, Boolean(logo)),
    attachments,
  });

  if (error) {
    console.error("Payment receipt email failed:", error);
    return { sent: false, error: error.message };
  }

  return { sent: true };
}
