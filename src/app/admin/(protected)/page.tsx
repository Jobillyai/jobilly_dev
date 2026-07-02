import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { AdminMeetingTasks } from "@/components/admin/admin-meeting-tasks";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity";
import { ManagerTeamOverview } from "@/components/admin/manager-team-overview";
import {
  getAdminUser,
  staffCanScrapeJobs,
  staffIsManager,
  toStaffContext,
} from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import { getAdminDashboardOverview } from "@/server/services/admin-dashboard";
import styles from "../admin.module.css";

export default async function AdminDashboardPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isManager = staffIsManager(staff);
  const { stats, recentCandidates, recentSubmissions, upcomingMeetings, mentorActivity } =
    await getAdminDashboardOverview(staff);

  const candidatesWithSubmission =
    stats.totalCandidates - stats.candidatesWithoutSubmission;
  const invitesSent = Math.max(0, stats.advisorySubmissions - stats.pendingInvites);
  const unselectedJobs = Math.max(0, stats.scrapedJobs - stats.selectedJobs);

  const managerStatCards = [
    { label: "Total candidates", value: stats.totalCandidates },
    { label: "Mentor admins", value: stats.mentorCount },
    { label: "Applications submitted", value: stats.appliedJobs },
    { label: "Scraped jobs", value: stats.scrapedJobs },
    { label: "Shortlisted", value: stats.selectedJobs },
    { label: "Advisory submissions", value: stats.advisorySubmissions },
    { label: "Pending Meet invites", value: stats.pendingInvites },
    { label: "Unassigned submissions", value: stats.candidatesWithoutSubmission },
  ];

  const mentorStatCards = [
    { label: "My candidates", value: stats.totalCandidates },
    { label: "Applications submitted", value: stats.appliedJobs },
    { label: "Scraped jobs", value: stats.scrapedJobs },
    { label: "Shortlisted", value: stats.selectedJobs },
    { label: "Advisory submissions", value: stats.advisorySubmissions },
    { label: "Pending Meet invites", value: stats.pendingInvites },
  ];

  const statCards = isManager ? managerStatCards : mentorStatCards;

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {isManager ? (
              <>
                Manager <em className={styles.titleEm}>dashboard</em>
              </>
            ) : (
              <>
                Admin <em className={styles.titleEm}>dashboard</em>
              </>
            )}
          </h1>
          <p className={styles.subtitle}>
            Welcome back{admin.name ? `, ${formatDisplayName(admin.name)}` : ""}.
            {admin.memberId ? (
              <>
                {" "}
                Your member ID is <MemberIdBadge memberId={admin.memberId} size="sm" />.
              </>
            ) : null}{" "}
            {isManager
              ? "Full access — monitor mentors, candidates, and applications across the team."
              : "Search jobs for your assigned candidates (once every 3 hours per role), shortlist roles, and submit applications."}
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

        {isManager && mentorActivity ? (
          <ManagerTeamOverview
            mentors={mentorActivity}
            totalApplications={stats.appliedJobs}
          />
        ) : null}

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
