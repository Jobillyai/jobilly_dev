import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getAdminUser,
  staffCanScrapeJobs,
  staffIsManager,
  toStaffContext,
} from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { formatExperienceYears } from "@/lib/format-experience-years";
import { getAdminCandidates } from "@/server/services/admin-dashboard";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import { createClient } from "@/server/db/supabase-server";
import styles from "../../admin.module.css";

export default async function AdminJobsPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isManager = staffIsManager(staff);
  const canScrape = staffCanScrapeJobs(staff);
  const candidates = await getAdminCandidates(staff);

  const supabase = await createClient();
  const { data: scrapedRows } = await supabase
    .from("scraped_jobs")
    .select("candidate_id, selected, applied");

  const counts = new Map<string, { total: number; selected: number; applied: number }>();
  for (const row of scrapedRows ?? []) {
    const current = counts.get(row.candidate_id) ?? {
      total: 0,
      selected: 0,
      applied: 0,
    };
    current.total += 1;
    if (row.selected) {
      current.selected += 1;
    }
    if (row.applied) {
      current.applied += 1;
    }
    counts.set(row.candidate_id, current);
  }

  const jobCounts = candidates.map((candidate) => ({
    candidate,
    totalJobs: counts.get(candidate.id)?.total ?? 0,
    selectedJobs: counts.get(candidate.id)?.selected ?? 0,
    appliedJobs: counts.get(candidate.id)?.applied ?? 0,
  }));

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Job <em className={styles.titleEm}>listings</em>
          </h1>
          <p className={styles.subtitle}>
            {canScrape
              ? "Search Indeed and LinkedIn for your assigned candidates from each job sheet. Each role can be searched once every 3 hours to control API billing."
              : isManager
                ? "Review scraped jobs across candidates. Job searches are run by assigned admins from each candidate sheet."
                : "Review stored jobs for your assigned candidates, then mark applications."}
          </p>
        </div>

        {canScrape ? (
          <div className={styles.section}>
            <p className={styles.subtitle}>
              Open a candidate&apos;s job sheet below to search. Bulk scraping all candidates is
              disabled.
            </p>
          </div>
        ) : null}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {isManager ? "All candidates" : "Your assigned candidates"} ({candidates.length})
          </h2>
          {candidates.length === 0 ? (
            <div className={styles.emptyState}>
              {isManager
                ? "No candidates yet."
                : "No candidates assigned to you yet."}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Target role</th>
                    <th>Years exp.</th>
                    <th>Advisory</th>
                    <th>Scraped jobs</th>
                    <th>Shortlisted</th>
                    <th>Applied</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobCounts.map(({ candidate, totalJobs, selectedJobs, appliedJobs }) => {
                    const displayName = candidate.name
                      ? formatDisplayName(candidate.name)
                      : formatDisplayName(
                          candidate.email.split("@")[0] ?? candidate.email,
                        );

                    return (
                      <tr key={candidate.id}>
                        <td>{displayName}</td>
                        <td>{candidate.email}</td>
                        <td>
                          {candidate.jobSearchRole ||
                            resolveCandidateJobRole(candidate) ||
                            "—"}
                        </td>
                        <td>
                          {formatExperienceYears(candidate.experienceYears) || "—"}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${
                              candidate.submission
                                ? styles.badgeSubmitted
                                : styles.badgePending
                            }`}
                          >
                            {candidate.submission ? "Submitted" : "None"}
                          </span>
                        </td>
                        <td>{totalJobs}</td>
                        <td>{selectedJobs}</td>
                        <td>{appliedJobs}</td>
                        <td>
                          <Link
                            href={`/admin/candidates/${candidate.id}/jobs`}
                            className={styles.jobsBtn}
                          >
                            Open job sheet
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
