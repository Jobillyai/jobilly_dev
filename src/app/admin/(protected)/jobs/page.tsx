import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { getAdminCandidates } from "@/server/services/admin-dashboard";
import { createClient } from "@/server/db/supabase-server";
import styles from "../../admin.module.css";

export default async function AdminJobsPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const candidates = await getAdminCandidates();

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
            Job <em className={styles.titleEm}>scraping</em>
          </h1>
          <p className={styles.subtitle}>
            Search Indeed jobs via Apify using each candidate&apos;s interests, then mark
            applications so candidates can track them.
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Candidates ({candidates.length})</h2>
          {candidates.length === 0 ? (
            <div className={styles.emptyState}>No candidates to manage yet.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email</th>
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
