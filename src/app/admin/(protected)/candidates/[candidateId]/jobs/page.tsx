import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CandidateJobsNav } from "@/components/admin/candidate-jobs-nav";
import { CandidateJobsSheet } from "@/components/admin/candidate-jobs-sheet";
import { CandidateTimeWidget } from "@/components/admin/candidate-time-widget";
import {
  getAdminUser,
  staffCanAccessJobApplyPortal,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import {
  getCandidateAppliedJobCount,
  getCandidateJobListings,
  getCandidatePreviousSearches,
} from "@/server/services/candidate-jobs";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import styles from "@/app/admin/admin.module.css";
import { getResumeIntelligence } from "@/server/services/resume-intelligence";

export const maxDuration = 300;

type AdminCandidateJobsPageProps = {
  params: {
    candidateId: string;
  };
};

export default async function AdminCandidateJobsPage({
  params,
}: AdminCandidateJobsPageProps) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  if (!staffCanAccessJobApplyPortal(staff)) {
    redirect("/admin/candidates");
  }

  const candidate = await getAdminCandidateById(params.candidateId, staff);

  if (!candidate) {
    notFound();
  }

  if (!candidate.hasManagedApplications) {
    redirect("/admin/jobs");
  }

  const intelligence = await getResumeIntelligence(candidate.id);
  const defaultInterestedRole =
    intelligence.analysis?.canonical_search_title ??
    resolveCandidateJobRole(candidate) ??
    "";

  const jobs = await getCandidateJobListings(candidate.id, defaultInterestedRole);
  const [previousSearches, appliedCount] = await Promise.all([
    getCandidatePreviousSearches(candidate.id),
    getCandidateAppliedJobCount(candidate.id),
  ]);

  const displayName = candidate.name
    ? formatDisplayName(candidate.name)
    : formatDisplayName(candidate.email.split("@")[0] ?? candidate.email);

  return (
    <div className={styles.adminPage}>
      <main className={styles.jobsMain}>
        <Link href="/admin/candidates" className={styles.backLink}>
          ← Back to candidates
        </Link>

        <div className={styles.headerRow}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {staffCanScrapeJobs(staff) ? "Apply for jobs" : "Job listings"} for{" "}
              <em className={styles.titleEm}>{displayName}</em>
            </h1>
          </div>
          <CandidateTimeWidget
            location={candidate.location}
            timezone={candidate.timezone}
          />
        </div>

        <CandidateJobsNav
          candidateId={candidate.id}
          appliedCount={appliedCount}
          active="pipeline"
        />

        <div className={styles.jobsSheetSection}>
          <CandidateJobsSheet
            key={candidate.id}
            candidateId={candidate.id}
            candidateExperienceYears={candidate.experienceYears}
            defaultInterestedRole={defaultInterestedRole}
            initialJobs={jobs}
            initialPreviousSearches={previousSearches}
            canScrape={staffCanScrapeJobs(staff)}
            viewMode="pipeline"
            appliedCount={appliedCount}
            initialResumeIntelligence={intelligence}
            candidateResumeMatch={{
              workExperience: candidate.workExperience,
              profileEducation: candidate.profileEducation,
              specialization: candidate.specialization,
              careerGoals: candidate.careerGoals,
              branch: candidate.submission?.branch ?? null,
              interestedTechnology: candidate.submission?.interestedTechnology ?? null,
              graduationDetails: candidate.submission?.graduationDetails ?? null,
              interestedRole: defaultInterestedRole,
            }}
          />
        </div>
      </main>
    </div>
  );
}
