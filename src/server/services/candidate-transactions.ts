import "server-only";

import {
  getPremiumPlan,
  type PremiumPlanId,
} from "@/lib/candidate-services";
import { createAdminClient } from "@/server/db/supabase-admin";
import type { PaymentReceiptData } from "@/server/services/payment-receipt";

export type CandidateTransaction = {
  id: string;
  userId: string;
  candidateName: string;
  candidateEmail: string;
  plan: PremiumPlanId;
  planTitle: string;
  status: "active" | "past_due" | "cancelled";
  amountUsd: number;
  currency: string;
  transactionReference: string;
  receiptNumber: string;
  source: string;
  paidAt: string;
  receiptEmailedAt: string | null;
  billingPhone: string;
  billingAddress: string;
};

const TRANSACTION_SELECT =
  "id, user_id, plan, status, billing_name, billing_email, billing_phone, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_postal_code, billing_country, source, paid_at, transaction_reference, receipt_number, amount_usd, currency, receipt_emailed_at" as const;

type TransactionRow = {
  id: string;
  user_id: string;
  plan: PremiumPlanId;
  status: "active" | "past_due" | "cancelled";
  billing_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postal_code: string | null;
  billing_country: string;
  source: string;
  paid_at: string | null;
  transaction_reference: string | null;
  receipt_number: string | null;
  amount_usd: number | null;
  currency: string;
  receipt_emailed_at: string | null;
};

function mapTransaction(
  row: TransactionRow,
  user?: { name: string | null; email: string } | null,
): CandidateTransaction {
  const plan = getPremiumPlan(row.plan);
  const billingAddress = [
    row.billing_address_line1,
    row.billing_address_line2,
    row.billing_city,
    row.billing_state,
    row.billing_postal_code,
    row.billing_country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    id: row.id,
    userId: row.user_id,
    candidateName: row.billing_name || user?.name || "Candidate",
    candidateEmail: row.billing_email || user?.email || "—",
    plan: row.plan,
    planTitle: plan?.title ?? row.plan,
    status: row.status,
    amountUsd: row.amount_usd ?? plan?.priceUsd ?? 0,
    currency: row.currency || "USD",
    transactionReference: row.transaction_reference ?? `LEGACY-${row.id.slice(0, 8)}`,
    receiptNumber: row.receipt_number ?? `LEGACY-${row.id.slice(0, 8)}`,
    source: row.source,
    paidAt: row.paid_at ?? new Date(0).toISOString(),
    receiptEmailedAt: row.receipt_emailed_at,
    billingPhone: row.billing_phone ?? "—",
    billingAddress,
  };
}

export async function listCandidateTransactions(): Promise<CandidateTransaction[]> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("job_subscriptions")
    .select(TRANSACTION_SELECT)
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false });

  if (error || !rows) {
    if (error) console.error("listCandidateTransactions failed:", error);
    return [];
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: users } =
    userIds.length > 0
      ? await admin.from("users").select("id, name, email").in("id", userIds)
      : { data: [] };
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));

  return (rows as TransactionRow[]).map((row) =>
    mapTransaction(row, usersById.get(row.user_id)),
  );
}

export async function getCandidateTransaction(
  transactionId: string,
): Promise<CandidateTransaction | null> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("job_subscriptions")
    .select(TRANSACTION_SELECT)
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const { data: user } = await admin
    .from("users")
    .select("name, email")
    .eq("id", row.user_id)
    .maybeSingle();

  return mapTransaction(row as TransactionRow, user);
}

export function transactionToReceipt(
  transaction: CandidateTransaction,
): PaymentReceiptData {
  return {
    subscriptionId: transaction.id,
    transactionReference: transaction.transactionReference,
    receiptNumber: transaction.receiptNumber,
    candidateName: transaction.candidateName,
    candidateEmail: transaction.candidateEmail,
    billingPhone: transaction.billingPhone,
    billingAddress: transaction.billingAddress,
    planId: transaction.plan,
    planTitle: transaction.planTitle,
    amountUsd: transaction.amountUsd,
    currency: transaction.currency,
    paidAt: transaction.paidAt,
  };
}
