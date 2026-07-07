import { redirect } from "next/navigation";
import { getAdminUser, staffIsManager, toStaffContext } from "@/lib/auth/admin";
import { getAdminCandidates } from "@/server/services/admin-dashboard";
import { listMentorAdmins } from "@/server/services/service-requests";
import { getDefaultGoogleMeetUrl } from "@/server/services/send-mentor-meeting-link";
import { CandidatesList } from "@/components/admin/candidates-list";
import styles from "../../admin.module.css";

export default async function AdminCandidatesPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isManager = staffIsManager(staff);
  const isMentor = !isManager;
  const defaultMeetUrl = getDefaultGoogleMeetUrl();
  const [candidates, mentors] = await Promise.all([
    getAdminCandidates(staff),
    isManager ? listMentorAdmins() : Promise.resolve([]),
  ]);
  const submissionCount = candidates.filter((candidate) => candidate.submission).length;
  const unassignedCount = candidates.filter(
    (candidate) => !candidate.assignedEmployeeId,
  ).length;

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Candidate <em className={styles.titleEm}>details</em>
          </h1>
          <p className={styles.subtitle}>
            Browse {isManager ? "all" : "your assigned"} candidates. Expand a row for profile
            and advisory details.
            {isManager && unassignedCount > 0
              ? ` ${unassignedCount} candidate${unassignedCount === 1 ? "" : "s"} still need a mentor assigned.`
              : !isManager
                ? " Use Apply for jobs to search listings and submit applications."
                : ""}
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            All candidates ({candidates.length})
            {submissionCount > 0 ? ` · ${submissionCount} with submissions` : ""}
          </h2>
          <CandidatesList
            candidates={candidates}
            mentors={mentors}
            isManager={isManager}
            isMentor={isMentor}
            defaultMeetUrl={defaultMeetUrl}
          />
        </section>
      </main>
    </div>
  );
}
