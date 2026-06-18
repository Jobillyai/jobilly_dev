import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CandidateJobsSheet } from "@/components/admin/candidate-jobs-sheet";
import { getAdminUser } from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { buildCandidateSearchTerms } from "@/server/services/candidate-job-search";
import {
  getCandidateJobListings,
  refreshCandidateJobListings,
} from "@/server/services/candidate-jobs";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import styles from "@/app/admin/admin.module.css";

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

  const candidate = await getAdminCandidateById(params.candidateId);

  if (!candidate) {
    notFound();
  }

  let jobs = await getCandidateJobListings(candidate.id);
  let searchTerms = buildCandidateSearchTerms(candidate);

  if (jobs.length === 0) {
    const refreshed = await refreshCandidateJobListings(candidate, admin.id);
    jobs = refreshed.jobs;
    searchTerms = refreshed.searchTerms;
  }

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
            Job scraper for <em className={styles.titleEm}>{displayName}</em>
          </h1>
          <p className={styles.subtitle}>
            Scraped roles matched to {candidate.email}
            {candidate.submission?.branch ? ` · ${candidate.submission.branch}` : ""}
            {candidate.submission?.interestedTechnology
              ? ` · ${candidate.submission.interestedTechnology}`
              : ""}
            {candidate.resumeUrl ? " · Resume on file" : ""}.
          </p>
        </div>

        <section className={styles.section}>
          <CandidateJobsSheet
            candidateId={candidate.id}
            candidateName={displayName}
            searchTerms={searchTerms}
            hasResume={Boolean(candidate.resumeUrl)}
            initialJobs={jobs}
          />
        </section>
      </main>
    </div>
  );
}
