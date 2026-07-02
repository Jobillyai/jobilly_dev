import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CandidateJobsNav } from "@/components/admin/candidate-jobs-nav";
import { CandidateJobsSheet } from "@/components/admin/candidate-jobs-sheet";
import {
  getAdminUser,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { formatExperienceYears } from "@/lib/format-experience-years";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import {
  getCandidateAppliedJobCount,
  getCandidateAppliedJobListings,
  getCandidatePreviousSearches,
} from "@/server/services/candidate-jobs";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import styles from "@/app/admin/admin.module.css";

type AdminCandidateAppliedJobsPageProps = {
  params: {
    candidateId: string;
  };
};

export default async function AdminCandidateAppliedJobsPage({
  params,
}: AdminCandidateAppliedJobsPageProps) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const candidate = await getAdminCandidateById(params.candidateId, staff);

  if (!candidate) {
    notFound();
  }

  const defaultInterestedRole = resolveCandidateJobRole(candidate) ?? "";
  const [jobs, previousSearches, appliedCount] = await Promise.all([
    getCandidateAppliedJobListings(
      candidate.id,
      null,
    ),
    getCandidatePreviousSearches(candidate.id),
    getCandidateAppliedJobCount(candidate.id),
  ]);

  const displayName = candidate.name
    ? formatDisplayName(candidate.name)
    : formatDisplayName(candidate.email.split("@")[0] ?? candidate.email);

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <Link href="/admin/candidates" className={styles.backLink}>
          ← Back to candidates
        </Link>

        <div className={styles.header}>
          <h1 className={styles.title}>
            Applied jobs for <em className={styles.titleEm}>{displayName}</em>
          </h1>
          <p className={styles.subtitle}>
            Roles your team has submitted for {candidate.email}
            {defaultInterestedRole ? ` · Target role: ${defaultInterestedRole}` : ""}
            {candidate.experienceYears !== null
              ? ` · ${formatExperienceYears(candidate.experienceYears)} exp.`
              : ""}
            .
          </p>
        </div>

        <CandidateJobsNav
          candidateId={candidate.id}
          appliedCount={appliedCount}
          active="applied"
        />

        <section className={styles.section}>
          <CandidateJobsSheet
            candidateId={candidate.id}
            candidateName={displayName}
            candidateExperienceYears={candidate.experienceYears}
            defaultInterestedRole={defaultInterestedRole}
            initialJobs={jobs}
            initialPreviousSearches={previousSearches}
            canScrape={staffCanScrapeJobs(staff)}
            viewMode="applied"
            appliedCount={appliedCount}
          />
        </section>
      </main>
    </div>
  );
}
