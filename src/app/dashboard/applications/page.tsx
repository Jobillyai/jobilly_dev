import { redirect } from "next/navigation";
import { AppliedJobsList } from "@/components/dashboard/applied-jobs-list";
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
  const unreadCount = applications.filter((job) => job.isNew).length;

  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${pageStyles.main}`}>
        <div className={pageStyles.header}>
          <h1 className={styles.title}>
            My <em className={styles.titleEm}>Applications</em>
          </h1>
          <p className={pageStyles.subtitle}>
            When our team applies to a role on your behalf, you&apos;ll see the job
            description and tailored preparation tips here.
          </p>
          {unreadCount > 0 ? (
            <p className={pageStyles.unreadNotice}>
              {unreadCount} new application update{unreadCount === 1 ? "" : "s"} from your
              Jobilly team.
            </p>
          ) : null}
        </div>

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
