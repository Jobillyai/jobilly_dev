export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppliedJobsList } from "@/components/dashboard/applied-jobs-list";
import { PortalDateLabel } from "@/components/layout/portal-date-label";
import { getSessionUser } from "@/lib/auth/session";
import { getCandidateAppliedJobs } from "@/server/services/candidate-jobs";
import styles from "../dashboard.module.css";
import pageStyles from "./applications.module.css";

export default async function CandidateApplicationsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const applications = await getCandidateAppliedJobs(user.id);

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

        <PortalDateLabel />

        {applications.length === 0 ? (
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
