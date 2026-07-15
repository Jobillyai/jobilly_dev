import { redirect } from "next/navigation";
import { CandidatePlans } from "@/components/dashboard/candidate-plans";
import {
  defaultPremiumPlanId,
  getPremiumPlan,
  type PremiumPlanId,
} from "@/lib/candidate-services";
import { getSessionUser } from "@/lib/auth/session";
import { getCandidateSubscription } from "@/server/services/candidate-subscriptions";

type CandidatePlansPageProps = {
  searchParams?: {
    plan?: string;
  };
};

export default async function CandidatePlansPage({
  searchParams,
}: CandidatePlansPageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const hasRequestedPlan = Boolean(
    getPremiumPlan(searchParams?.plan as PremiumPlanId),
  );
  const requestedPlan = hasRequestedPlan
    ? (searchParams?.plan as PremiumPlanId)
    : defaultPremiumPlanId;
  const subscription = await getCandidateSubscription(user.id);

  return (
    <CandidatePlans
      initialPlanId={requestedPlan}
      openCheckoutInitially={hasRequestedPlan}
      currentPlanId={subscription?.plan ?? null}
      candidateName={user.name ?? ""}
      candidateEmail={user.email}
    />
  );
}
