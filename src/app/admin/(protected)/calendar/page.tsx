import { redirect } from "next/navigation";
import { AdminCalendarView } from "@/components/admin/admin-calendar-view";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminUser } from "@/lib/auth/admin";
import { getAdminCalendarOverview } from "@/server/services/admin-dashboard";
import styles from "../../admin.module.css";

export default async function AdminCalendarPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const { upcoming, pendingInvites, past } = await getAdminCalendarOverview();
  const totalSessions = upcoming.length + pendingInvites.length + past.length;

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <AdminPageHeader
          eyebrow="Schedule"
          title="Calendar"
          subtitle="Career advisory sessions and Google Meet invites sent to candidates after form submission."
        />

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total submissions</div>
            <div className={styles.statValue}>{totalSessions}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Upcoming sessions</div>
            <div className={styles.statValue}>{upcoming.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pending invites</div>
            <div className={styles.statValue}>{pendingInvites.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Past sessions</div>
            <div className={styles.statValue}>{past.length}</div>
          </div>
        </div>

        <AdminCalendarView
          upcoming={upcoming}
          pendingInvites={pendingInvites}
          past={past}
        />
      </main>
    </div>
  );
}
