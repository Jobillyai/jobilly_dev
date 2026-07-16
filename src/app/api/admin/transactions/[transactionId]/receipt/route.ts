import { NextResponse } from "next/server";
import {
  getAdminUser,
  staffIsManager,
  toStaffContext,
} from "@/lib/auth/admin";
import {
  getCandidateTransaction,
  transactionToReceipt,
} from "@/server/services/candidate-transactions";
import { buildPaymentReceiptPdf } from "@/server/services/payment-receipt";

export async function GET(
  _request: Request,
  { params }: { params: { transactionId: string } },
) {
  const admin = await getAdminUser();
  if (!admin || !staffIsManager(toStaffContext(admin))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const transaction = await getCandidateTransaction(params.transactionId);
  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const pdf = buildPaymentReceiptPdf(transactionToReceipt(transaction));
  const body = Uint8Array.from(pdf).buffer;
  const safeReceipt = transaction.receiptNumber.replace(/[^a-z0-9-]/gi, "_");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeReceipt}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
