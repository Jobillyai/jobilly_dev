import "server-only";
import {
  getPremiumPlan,
  type PremiumPlanId,
} from "@/lib/candidate-services";
import { createAdminClient } from "@/server/db/supabase-admin";
import {
  sendPaymentReceiptEmail,
  type PaymentReceiptData,
} from "@/server/services/payment-receipt";

export type CandidateSubscription = {
  id: string;
  userId: string;
  plan: PremiumPlanId;
  status: "active" | "past_due" | "cancelled";
  startDate: string;
  endDate: string | null;
  paidAt: string | null;
};

export type CandidateEntitlements = {
  hasMockInterviews: boolean;
  hasManagedApplications: boolean;
};

export const NO_CANDIDATE_ENTITLEMENTS: CandidateEntitlements = {
  hasMockInterviews: false,
  hasManagedApplications: false,
};

export function entitlementsForPlan(
  plan: PremiumPlanId | null | undefined,
): CandidateEntitlements {
  return {
    hasMockInterviews: plan === "mock-interviews" || plan === "mock-and-job",
    hasManagedApplications: plan === "job-applications" || plan === "mock-and-job",
  };
}

export async function getCandidateSubscription(
  userId: string,
): Promise<CandidateSubscription | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_subscriptions")
    .select("id, user_id, plan, status, start_date, end_date, paid_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    plan: data.plan,
    status: data.status,
    startDate: data.start_date,
    endDate: data.end_date,
    paidAt: data.paid_at,
  };
}

export async function getCandidateEntitlements(
  userId: string,
): Promise<CandidateEntitlements> {
  const subscription = await getCandidateSubscription(userId);
  return entitlementsForPlan(subscription?.plan);
}

export async function completeMockCheckout(input: {
  userId: string;
  candidateName: string;
  candidateEmail: string;
  plan: PremiumPlanId;
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): Promise<{
  subscriptionId?: string;
  receiptNumber?: string;
  receiptEmailSent?: boolean;
  warning?: string;
  error?: string;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const plan = getPremiumPlan(input.plan);
  if (!plan) {
    return { error: "Unknown candidate plan." };
  }

  const unique = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  const datePart = now.slice(0, 10).replaceAll("-", "");
  const transactionReference = `MOCK-${unique.slice(0, 16)}`;
  const receiptNumber = `JB-${datePart}-${unique.slice(-8)}`;

  const { data: subscriptionId, error: checkoutError } = await admin.rpc(
    "complete_mock_checkout_transaction",
    {
      p_user_id: input.userId,
      p_plan: input.plan,
      p_billing_name: input.billingName,
      p_billing_email: input.billingEmail,
      p_billing_phone: input.billingPhone,
      p_billing_address_line1: input.addressLine1,
      p_billing_address_line2: input.addressLine2 ?? "",
      p_billing_city: input.city,
      p_billing_state: input.state,
      p_billing_postal_code: input.postalCode,
      p_billing_country: input.country,
      p_transaction_reference: transactionReference,
      p_receipt_number: receiptNumber,
      p_amount_usd: plan.priceUsd,
      p_paid_at: now,
    },
  );

  if (checkoutError || !subscriptionId) {
    return {
      error: checkoutError?.message ?? "Could not complete the mock checkout.",
    };
  }

  const billingAddress = [
    input.addressLine1,
    input.addressLine2,
    input.city,
    input.state,
    input.postalCode,
    input.country,
  ]
    .filter(Boolean)
    .join(", ");
  const receipt: PaymentReceiptData = {
    subscriptionId,
    transactionReference,
    receiptNumber,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    billingPhone: input.billingPhone,
    billingAddress,
    planId: input.plan,
    planTitle: plan.title,
    amountUsd: plan.priceUsd,
    currency: "USD",
    paidAt: now,
  };
  const emailResult = await sendPaymentReceiptEmail(receipt);

  if (emailResult.sent) {
    await admin
      .from("job_subscriptions")
      .update({ receipt_emailed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", subscriptionId);
  }

  return {
    subscriptionId,
    receiptNumber,
    receiptEmailSent: emailResult.sent,
    warning: emailResult.sent
      ? undefined
      : "Plan activated, but the payment acknowledgement email could not be sent.",
  };
}
