import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CandidateLocalTime } from "@/components/admin/candidate-local-time";
import {
  getAdminUser,
  staffCanAccessJobApplyPortal,
  toStaffContext,
} from "@/lib/auth/admin";
import { adminApplyForJobsCandidatePath } from "@/lib/admin/apply-for-jobs-paths";
import { formatDisplayName } from "@/lib/format-display-name";
import { formatExperienceYears } from "@/lib/format-experience-years";
import { getPremiumPlan } from "@/lib/candidate-services";
import { getAdminCandidates } from "@/server/services/admin-dashboard";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import { createClient } from "@/server/db/supabase-server";
import styles from "../../../admin.module.css";

export default async function AdminApplyForJobsPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  if (!staffCanAccessJobApplyPortal(staff)) {
    redirect("/admin");
  }

  const candidates = await getAdminCandidates(staff);
  const eligibleCandidates = candidates.filter(
    (candidate) => candidate.hasManagedApplications,
  );

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

  const jobCounts = eligibleCandidates.map((candidate) => ({
    candidate,
    totalJobs: counts.get(candidate.id)?.total ?? 0,
    selectedJobs: counts.get(candidate.id)?.selected ?? 0,
    appliedJobs: counts.get(candidate.id)?.applied ?? 0,
  }));

  return (
    <div className={styles.adminPage}>
      <main className={styles.jobsMain}>
        <AdminPageHeader
          eyebrow="Applications"
          title="Apply for jobs"
          subtitle="Search LinkedIn and Indeed in parallel for your assigned candidates from each job sheet. Each role can be searched once every 3 hours."
        />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Managed Applications candidates ({eligibleCandidates.length})
          </h2>
          {eligibleCandidates.length === 0 ? (
            <div className={styles.emptyState}>
              No assigned candidates currently have the Job Applications or Full Bundle plan.
              Job sheets are hidden for Free and Mock Interviews-only candidates.
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Local time</th>
                    <th>Target role</th>
                    <th>Years exp.</th>
                    <th>Advisory</th>
                    <th>Plan</th>
                    <th>Jobs found</th>
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
                          {candidate.timezone ? (
                            <CandidateLocalTime timezone={candidate.timezone} />
                          ) : (
                            "—"
                          )}
                        </td>
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
                        <td>
                          {candidate.subscriptionPlan
                            ? getPremiumPlan(candidate.subscriptionPlan)?.shortLabel
                            : "No paid plan"}
                        </td>
                        <td>{totalJobs}</td>
                        <td>{selectedJobs}</td>
                        <td>{appliedJobs}</td>
                        <td>
                          <Link
                            href={adminApplyForJobsCandidatePath(candidate.id)}
                            className={styles.jobsBtn}
                          >
                            Apply for jobs
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
