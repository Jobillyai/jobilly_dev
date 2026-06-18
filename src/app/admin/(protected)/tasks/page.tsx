import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import styles from "../../admin.module.css";

export default async function AdminTasksPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Admin <em className={styles.titleEm}>tasks</em>
          </h1>
          <p className={styles.subtitle}>
            Track follow-ups, reviews, and action items for your candidates.
          </p>
        </div>

        <div className={styles.placeholderCard}>
          <h2 className={styles.placeholderTitle}>Tasks coming soon</h2>
          <p className={styles.placeholderText}>
            This section will let you assign and manage tasks for career
            advisory sessions and candidate follow-ups.
          </p>
        </div>
      </main>
    </div>
  );
}
