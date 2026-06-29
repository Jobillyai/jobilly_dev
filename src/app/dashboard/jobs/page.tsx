import { redirect } from "next/navigation";
import { CandidateMatchedJobs } from "@/components/dashboard/candidate-matched-jobs";
import { getSessionUser } from "@/lib/auth/session";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import { getCandidateJobListings } from "@/server/services/candidate-jobs";
import styles from "../dashboard.module.css";
import pageStyles from "./jobs.module.css";

export default async function CandidateJobsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const candidate = await getAdminCandidateById(user.id);
  const targetRole = candidate ? resolveCandidateJobRole(candidate) ?? "" : "";
  const jobs = targetRole ? await getCandidateJobListings(user.id, targetRole) : [];

  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${pageStyles.main}`}>
        <div className={pageStyles.header}>
          <h1 className={styles.title}>
            Matched <em className={styles.titleEm}>roles</em>
          </h1>
          <p className={pageStyles.subtitle}>
            Roles your Jobilly team is finding for you. The list updates automatically
            while new jobs are scraped — based on your target role and years of experience.
          </p>
        </div>

        <CandidateMatchedJobs
          candidateId={user.id}
          initialJobs={jobs}
          initialTargetRole={targetRole}
          initialExperienceYears={candidate?.experienceYears ?? null}
        />
      </main>
    </div>
  );
}
