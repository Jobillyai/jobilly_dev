import { getSessionUser } from "@/lib/auth/session";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getCareerAdvisoryIntakeForCandidate } from "@/server/services/career-advisory-intake";
import { getCandidateAppliedJobs } from "@/server/services/candidate-jobs";
import { listResumeAtsChecks } from "@/server/services/resume-ats-check";
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
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(sessionTime);
  }

  return "Completed";
}

export default async function DashboardPage() {
  const user = await getSessionUser();

  const [applications, atsChecks, advisory] = await Promise.all([
    user ? getCandidateAppliedJobs(user.id) : Promise.resolve([]),
    user ? listResumeAtsChecks(user.id) : Promise.resolve([]),
    user ? getCareerAdvisoryIntakeForCandidate(user.id) : Promise.resolve(null),
  ]);

  const latestCompleted = atsChecks.find((check) => check.status === "completed");
  const latestAtsScore = latestCompleted?.atsScore ?? null;

  const latestApplication = applications[0];
  const unreadApplicationCount = applications.filter((job) => job.isNew).length;
  const latestApplicationLabel = latestApplication
    ? `${latestApplication.role} at ${latestApplication.company}`
    : null;

  return (
    <div className={styles.page}>
      <DashboardHome
        userName={user?.name}
        applicationCount={applications.length}
        unreadApplicationCount={unreadApplicationCount}
        latestApplicationLabel={latestApplicationLabel}
        latestAtsScore={latestAtsScore}
        nextSessionLabel={formatSessionLabel(
          advisory?.sessionScheduledAt ?? null,
          advisory?.inviteSentAt ?? null,
        )}
      />
    </div>
  );
}
