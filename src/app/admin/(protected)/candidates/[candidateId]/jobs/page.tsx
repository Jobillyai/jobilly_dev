import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
  buildCandidateJobSearchQuery,
  buildCandidateSearchTerms,
} from "@/server/services/candidate-job-search";
import {
  getCandidateJobListings,
  getCandidatePreviousSearches,
} from "@/server/services/candidate-jobs";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import styles from "@/app/admin/admin.module.css";

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
  const candidate = await getAdminCandidateById(params.candidateId, staff);

  if (!candidate) {
    notFound();
  }

  const defaultInterestedRole = resolveCandidateJobRole(candidate) ?? "";

  const jobs = await getCandidateJobListings(candidate.id, defaultInterestedRole);
  const previousSearches = await getCandidatePreviousSearches(candidate.id);
  const searchTerms = buildCandidateSearchTerms(candidate, defaultInterestedRole);
  const searchQuery = buildCandidateJobSearchQuery(candidate, defaultInterestedRole);

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
            {staffCanScrapeJobs(staff) ? "Job scraper" : "Job listings"} for{" "}
            <em className={styles.titleEm}>{displayName}</em>
          </h1>
          <p className={styles.subtitle}>
            {staffCanScrapeJobs(staff)
              ? "Scrape and review roles matched to"
              : "Review manager-scraped roles for"}{" "}
            {candidate.email}
            {candidate.submission?.branch ? ` · ${candidate.submission.branch}` : ""}
            {candidate.submission?.interestedTechnology
              ? ` · ${candidate.submission.interestedTechnology}`
              : ""}
            {defaultInterestedRole ? ` · Target role: ${defaultInterestedRole}` : ""}
            {candidate.experienceYears !== null
              ? ` · ${formatExperienceYears(candidate.experienceYears)} exp.`
              : ""}
            {candidate.resumeUrl ? " · Resume on file" : ""}.
          </p>
        </div>

        <section className={styles.section}>
          <CandidateJobsSheet
            candidateId={candidate.id}
            candidateName={displayName}
            candidateExperienceYears={candidate.experienceYears}
            searchTerms={searchTerms}
            searchQuery={`${searchQuery.position} · ${searchQuery.location}`}
            defaultInterestedRole={defaultInterestedRole}
            hasResume={Boolean(candidate.resumeUrl)}
            initialJobs={jobs}
            initialPreviousSearches={previousSearches}
            canScrape={staffCanScrapeJobs(staff)}
          />
        </section>
      </main>
    </div>
  );
}
