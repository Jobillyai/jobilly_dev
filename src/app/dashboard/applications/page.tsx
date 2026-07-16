export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  formatPlanPriceMonthly,
  getPremiumPlan,
} from "@/lib/candidate-services";
import { AppliedJobsList } from "@/components/dashboard/applied-jobs-list";
import { getSessionUser } from "@/lib/auth/session";
import { getCandidateAppliedJobs } from "@/server/services/candidate-jobs";
import {
  entitlementsForPlan,
  getCandidateSubscription,
} from "@/server/services/candidate-subscriptions";
import styles from "../dashboard.module.css";
import pageStyles from "./applications.module.css";

export default async function CandidateApplicationsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const subscription = await getCandidateSubscription(user.id);
  const hasManagedApplications =
    entitlementsForPlan(subscription?.plan).hasManagedApplications;
  const applications = hasManagedApplications
    ? await getCandidateAppliedJobs(user.id)
    : [];
  const jobApplicationsPlan = getPremiumPlan("job-applications")!;
  const fullBundlePlan = getPremiumPlan("mock-and-job")!;
  const hasMockOnly = subscription?.plan === "mock-interviews";

  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${pageStyles.main}`}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>Student portal</p>
            <h1 className={styles.title}>My applications</h1>
            <p className={pageStyles.subtitle}>
              When our team applies to a role on your behalf, you&apos;ll see the full job
              description, tailored resume, and preparation tips here.
            </p>
          </div>
        </header>

        {!hasManagedApplications ? (
          <div className={pageStyles.emptyCard}>
            <p className={pageStyles.emptyTitle}>
              {hasMockOnly
                ? "Upgrade your Mock Interviews plan for job application access"
                : "You are not on a paid Managed Applications plan"}
            </p>
            <p className={pageStyles.emptyText}>
              {hasMockOnly
                ? "Your current plan includes mock interviews only. Upgrade to the Full Bundle to keep mock interviews and add role matching, tailored resumes, and applications by the Jobilly team."
                : "The free tier includes Career Advisory and candidate tools. Choose Job Applications or the Full Bundle to unlock managed applications."}
            </p>
            <div className={pageStyles.upgradeActions}>
              {!hasMockOnly ? (
                <Link
                  href="/dashboard/plans?plan=job-applications"
                  className={pageStyles.upgradeButton}
                >
                  Job Applications — {formatPlanPriceMonthly(jobApplicationsPlan.priceUsd)}
                </Link>
              ) : null}
              <Link
                href="/dashboard/plans?plan=mock-and-job"
                className={pageStyles.upgradeButtonSecondary}
              >
                Full Bundle — {formatPlanPriceMonthly(fullBundlePlan.priceUsd)}
              </Link>
            </div>
          </div>
        ) : applications.length === 0 ? (
          <div className={pageStyles.emptyCard}>
            <p className={pageStyles.emptyTitle}>No applications yet</p>
            <p className={pageStyles.emptyText}>
              Once our team applies to matched roles for you, they will show up here with
              the job description, company details, and interview prep tips.
            </p>
          </div>
        ) : (
          <AppliedJobsList applications={applications} />
        )}
      </main>
    </div>
  );
}
