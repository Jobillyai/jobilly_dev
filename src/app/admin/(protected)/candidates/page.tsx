import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getAdminCandidates } from "@/server/services/admin-dashboard";
import { CandidatesList } from "@/components/admin/candidates-list";
import styles from "../../admin.module.css";

export default async function AdminCandidatesPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const candidates = await getAdminCandidates();
  const submissionCount = candidates.filter((candidate) => candidate.submission).length;

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Candidate <em className={styles.titleEm}>details</em>
          </h1>
          <p className={styles.subtitle}>
            View registered candidates and their education details from career advisory
            submissions.
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            All candidates ({candidates.length})
            {submissionCount > 0 ? ` · ${submissionCount} with submissions` : ""}
          </h2>
          <CandidatesList candidates={candidates} />
        </section>
      </main>
    </div>
  );
}
