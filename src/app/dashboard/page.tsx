import { getSessionUser } from "@/lib/auth/session";
import { formatSessionDateTimeForCandidateShort } from "@/lib/career-advisory/session-datetime";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { entitlementsForPlan, getCandidateSubscription } from "@/server/services/candidate-subscriptions";
import { getCareerAdvisoryIntakeForCandidate } from "@/server/services/career-advisory-intake";
import { getCandidateAppliedJobs } from "@/server/services/candidate-jobs";
import styles from "./dashboard.module.css";

function formatSessionLabel(
  sessionScheduledAt: string | null,
  inviteSentAt: string | null,
): string {
  if (!inviteSentAt) {
    return "Not booked";
  }

  if (!sessionScheduledAt) {
    return "Invite sent";
  }

  const sessionTime = new Date(sessionScheduledAt);
  if (sessionTime.getTime() >= Date.now()) {
    return formatSessionDateTimeForCandidateShort(sessionTime);
  }

  return "Completed";
}

export default async function DashboardPage() {
  const user = await getSessionUser();

  const [subscription, advisory] = await Promise.all([
    user ? getCandidateSubscription(user.id) : Promise.resolve(null),
    user ? getCareerAdvisoryIntakeForCandidate(user.id) : Promise.resolve(null),
  ]);
  const hasManagedApplications =
    entitlementsForPlan(subscription?.plan).hasManagedApplications;
  const applications =
    user && hasManagedApplications ? await getCandidateAppliedJobs(user.id) : [];

  const latestApplication = applications[0];
  const unreadApplicationCount = applications.filter((job) => job.isNew).length;
  const latestApplicationLabel = latestApplication
    ? `${latestApplication.role} at ${latestApplication.company}`
    : null;

  return (
    <div className={styles.page}>
      <DashboardHome
        userName={user?.name}
        currentPlanId={subscription?.plan ?? null}
        applicationCount={applications.length}
        unreadApplicationCount={unreadApplicationCount}
        latestApplicationLabel={latestApplicationLabel}
        nextSessionLabel={formatSessionLabel(
          advisory?.sessionScheduledAt ?? null,
          advisory?.inviteSentAt ?? null,
        )}
      />
    </div>
  );
}
