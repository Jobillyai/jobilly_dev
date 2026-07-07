import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminMeetingTasks } from "@/components/admin/admin-meeting-tasks";
import { getAdminUser, staffIsManager, toStaffContext } from "@/lib/auth/admin";
import { getAdminMeetingTasks } from "@/server/services/admin-dashboard";
import { getDefaultGoogleMeetUrl } from "@/server/services/send-mentor-meeting-link";
import styles from "../../admin.module.css";

export default async function AdminTasksPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isMentor = !staffIsManager(staff);
  const tasks = await getAdminMeetingTasks();
  const defaultMeetUrl = getDefaultGoogleMeetUrl();

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Admin <em className={styles.titleEm}>tasks</em>
          </h1>
          <p className={styles.subtitle}>
            Career advisory meetings booked by candidates. Mentors can send a Google Meet
            link from here or from the candidate profile.
          </p>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>
              Scheduled meetings ({tasks.length})
            </h2>
            <Link href="/admin/calendar" className={styles.sectionLink}>
              View calendar
            </Link>
          </div>
          <AdminMeetingTasks
            tasks={tasks}
            isMentor={isMentor}
            defaultMeetUrl={defaultMeetUrl}
            emptyMessage="No meetings scheduled yet. Tasks appear here when candidates book a career advisory session."
          />
        </section>
      </main>
    </div>
  );
}
