import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDailyTasksForm } from "@/components/admin/admin-daily-tasks-form";
import { AdminDailyUpdatesPanel } from "@/components/admin/admin-daily-updates-panel";
import { AdminMeetingTasks } from "@/components/admin/admin-meeting-tasks";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminUser, staffIsManager, toStaffContext } from "@/lib/auth/admin";
import { getLocalDateString } from "@/lib/timezone-day-bounds";
import { getAdminMeetingTasks } from "@/server/services/admin-dashboard";
import {
  buildMentorDailyActivity,
  getAdminDailyUpdateTimezone,
  getManagerDailyUpdates,
  getMentorDailyUpdateForDate,
  getRecentManagerDailyUpdates,
} from "@/server/services/admin-daily-updates";
import { getDefaultGoogleMeetUrl } from "@/server/services/send-mentor-meeting-link";
import styles from "../../admin.module.css";

export default async function AdminTasksPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isManager = staffIsManager(staff);
  const timezone = getAdminDailyUpdateTimezone();
  const workDate = getLocalDateString(timezone);

  if (isManager) {
    const [todayUpdates, recentUpdates] = await Promise.all([
      getManagerDailyUpdates(workDate),
      getRecentManagerDailyUpdates(7),
    ]);

    return (
      <div className={styles.adminPage}>
        <main className={styles.main}>
          <AdminPageHeader
            eyebrow="Workflow"
            title="Daily mentor updates"
            subtitle="Mentors submit what they accomplished each day with remarks at the end. Updates are emailed to you when sent."
          />

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Today ({workDate})</h2>
            <AdminDailyUpdatesPanel
              updates={todayUpdates}
              emptyMessage="No mentor updates submitted yet today."
            />
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent updates</h2>
            <AdminDailyUpdatesPanel
              updates={recentUpdates.filter((update) => update.workDate !== workDate)}
              emptyMessage="No earlier updates this week."
            />
          </section>
        </main>
      </div>
    );
  }

  const [activity, existingUpdate, meetingTasks] = await Promise.all([
    buildMentorDailyActivity(staff.userId, workDate),
    getMentorDailyUpdateForDate(staff.userId, workDate),
    getAdminMeetingTasks(),
  ]);
  const defaultMeetUrl = getDefaultGoogleMeetUrl();

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <AdminPageHeader
          eyebrow="Workflow"
          title="Tasks"
          subtitle="Review what you did today, add remarks, and send your daily update to your manager."
        />

        <AdminDailyTasksForm
          workDate={workDate}
          activity={activity}
          existingUpdate={existingUpdate}
        />

        <section className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>
              Upcoming advisory meetings ({meetingTasks.length})
            </h2>
            <Link href="/admin/calendar" className={styles.sectionLink}>
              View calendar
            </Link>
          </div>
          <AdminMeetingTasks
            tasks={meetingTasks}
            isMentor
            defaultMeetUrl={defaultMeetUrl}
            compact
            emptyMessage="No upcoming advisory meetings. Bookings appear here when candidates schedule a session."
          />
        </section>
      </main>
    </div>
  );
}
