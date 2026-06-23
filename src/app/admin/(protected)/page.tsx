import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { AdminMeetingTasks } from "@/components/admin/admin-meeting-tasks";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity";
import { getAdminUser } from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { getAdminDashboardOverview } from "@/server/services/admin-dashboard";
import styles from "../admin.module.css";

export default async function AdminDashboardPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const { stats, recentCandidates, recentSubmissions, upcomingMeetings } =
    await getAdminDashboardOverview();

  const candidatesWithSubmission =
    stats.totalCandidates - stats.candidatesWithoutSubmission;
  const invitesSent = Math.max(0, stats.advisorySubmissions - stats.pendingInvites);
  const unselectedJobs = Math.max(0, stats.scrapedJobs - stats.selectedJobs);

  const statCards = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Free candidates", value: stats.freeCandidates },
    { label: "Premium candidates", value: stats.premiumCandidates },
    { label: "Advisory submissions", value: stats.advisorySubmissions },
    { label: "Pending Meet invites", value: stats.pendingInvites },
    { label: "Scraped jobs", value: stats.scrapedJobs },
    { label: "Jobs marked to apply", value: stats.selectedJobs },
    { label: "Candidates without submission", value: stats.candidatesWithoutSubmission },
  ];

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Admin <em className={styles.titleEm}>dashboard</em>
          </h1>
          <p className={styles.subtitle}>
            Welcome back{admin.name ? `, ${formatDisplayName(admin.name)}` : ""}. Monitor
            candidates, advisory intakes, and job scraping from one place.
          </p>
        </div>

        <div className={styles.statsGrid}>
          {statCards.map((card) => (
            <div key={card.label} className={styles.statCard}>
              <div className={styles.statLabel}>{card.label}</div>
              <div className={styles.statValue}>{card.value}</div>
            </div>
          ))}
        </div>

        <AdminDashboardCharts
          freeCandidates={stats.freeCandidates}
          premiumCandidates={stats.premiumCandidates}
          candidatesWithSubmission={candidatesWithSubmission}
          candidatesWithoutSubmission={stats.candidatesWithoutSubmission}
          invitesSent={invitesSent}
          pendingInvites={stats.pendingInvites}
          selectedJobs={stats.selectedJobs}
          unselectedJobs={unselectedJobs}
        />

        <AdminQuickActions />

        <section className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Upcoming meetings</h2>
            <Link href="/admin/tasks" className={styles.sectionLink}>
              View all tasks
            </Link>
          </div>
          <AdminMeetingTasks
            tasks={upcomingMeetings}
            compact
            emptyMessage="No upcoming career advisory meetings. New bookings will appear here after candidates submit the form."
          />
        </section>

        <AdminRecentActivity
          recentCandidates={recentCandidates}
          recentSubmissions={recentSubmissions}
        />
      </main>
    </div>
  );
}
