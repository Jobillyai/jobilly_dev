import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import styles from "../../admin.module.css";

export default async function AdminCalendarPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Admin <em className={styles.titleEm}>calendar</em>
          </h1>
          <p className={styles.subtitle}>
            View scheduled career advisory sessions and Google Meet bookings.
          </p>
        </div>

        <div className={styles.placeholderCard}>
          <h2 className={styles.placeholderTitle}>Calendar coming soon</h2>
          <p className={styles.placeholderText}>
            This section will show upcoming advisory sessions and meeting
            invites sent to candidates.
          </p>
        </div>
      </main>
    </div>
  );
}
