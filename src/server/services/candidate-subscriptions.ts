import "server-only";
import type { PremiumPlanId } from "@/lib/candidate-services";
import { createAdminClient } from "@/server/db/supabase-admin";

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
}): Promise<{ subscriptionId?: string; error?: string }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: cancelError } = await admin
    .from("job_subscriptions")
    .update({ status: "cancelled", end_date: now.slice(0, 10), updated_at: now })
    .eq("user_id", input.userId)
    .eq("status", "active");

  if (cancelError) {
    return { error: cancelError.message };
  }

  const { data: subscription, error: insertError } = await admin
    .from("job_subscriptions")
    .insert({
      user_id: input.userId,
      plan: input.plan,
      status: "active",
      billing_name: input.billingName,
      billing_email: input.billingEmail,
      billing_phone: input.billingPhone,
      billing_address_line1: input.addressLine1,
      billing_address_line2: input.addressLine2 || null,
      billing_city: input.city,
      billing_state: input.state,
      billing_postal_code: input.postalCode,
      billing_country: input.country,
      source: "mock_checkout",
      paid_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertError || !subscription) {
    return { error: insertError?.message ?? "Could not create the subscription." };
  }

  await Promise.all([
    admin
      .from("candidate_profiles")
      .upsert(
        { user_id: input.userId, subscription_status: "active", updated_at: now },
        { onConflict: "user_id" },
      ),
    admin
      .from("users")
      .update({ role: "subscribed_candidate" })
      .eq("id", input.userId),
  ]);

  return { subscriptionId: subscription.id };
}
