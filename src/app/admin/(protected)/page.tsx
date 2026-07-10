import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { AdminMeetingTasks } from "@/components/admin/admin-meeting-tasks";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity";
import { ManagerTeamOverview } from "@/components/admin/manager-team-overview";
import {
  getAdminUser,
  staffIsManager,
  toStaffContext,
} from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import { getAdminDashboardOverview } from "@/server/services/admin-dashboard";
import { countOpenNewCandidateSignups } from "@/server/services/service-requests";
import styles from "../admin.module.css";

export default async function AdminDashboardPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isManager = staffIsManager(staff);
  const [overview, openNewSignups] = await Promise.all([
    getAdminDashboardOverview(staff),
    isManager ? countOpenNewCandidateSignups() : Promise.resolve(0),
  ]);
  const { stats, recentCandidates, recentSubmissions, upcomingMeetings, mentorActivity } =
    overview;

  const candidatesWithSubmission =
    stats.totalCandidates - stats.candidatesWithoutSubmission;
  const invitesSent = Math.max(0, stats.advisorySubmissions - stats.pendingInvites);
  const unselectedJobs = Math.max(0, stats.scrapedJobs - stats.selectedJobs);

  const managerStatCards = [
    { label: "Total candidates", value: stats.totalCandidates },
    { label: "New signups to assign", value: openNewSignups },
    { label: "Mentor admins", value: stats.mentorCount },
    { label: "Applications submitted", value: stats.appliedJobs },
    { label: "Jobs found", value: stats.scrapedJobs },
    { label: "Shortlisted", value: stats.selectedJobs },
    { label: "Advisory submissions", value: stats.advisorySubmissions },
    { label: "Pending Meet invites", value: stats.pendingInvites },
    { label: "Unassigned submissions", value: stats.candidatesWithoutSubmission },
  ];

  const mentorStatCards = [
    { label: "My candidates", value: stats.totalCandidates },
    { label: "Applications submitted", value: stats.appliedJobs },
    { label: "Jobs found", value: stats.scrapedJobs },
    { label: "Shortlisted", value: stats.selectedJobs },
    { label: "Advisory submissions", value: stats.advisorySubmissions },
    { label: "Pending Meet invites", value: stats.pendingInvites },
  ];

  const statCards = isManager ? managerStatCards : mentorStatCards;
  const heroStats = statCards.slice(0, 3);
  const moreStats = statCards.slice(3);

  return (
    <div className={styles.adminPage}>
      <main className={`${styles.main} ${styles.dashboardMain}`}>
        <AdminPageHeader
          eyebrow={isManager ? "Manager portal" : "Admin portal"}
          title={isManager ? "Operations dashboard" : "Mentor dashboard"}
          subtitle={
            <>
              Welcome back{admin.name ? `, ${formatDisplayName(admin.name)}` : ""}.
              {admin.memberId ? (
                <>
                  {" "}
                  Member ID <MemberIdBadge memberId={admin.memberId} size="sm" />.
                </>
              ) : null}
            </>
          }
        />

        <section className={styles.heroCard}>
          <div className={styles.heroCardContent}>
            <h2 className={styles.heroCardTitle}>
              {isManager ? "Team overview" : "Your workspace"}
            </h2>
            <p className={styles.heroCardCopy}>
              {isManager
                ? "Monitor mentors, candidate signups, advisory submissions, and application progress across the team."
                : "Search roles, shortlist jobs, submit applications, and keep advisory sessions on track."}
            </p>
            <Link href="/admin/tasks" className={styles.heroCardCta}>
              View tasks
            </Link>
          </div>
          <div className={styles.heroMiniStats}>
            {heroStats.map((card) => (
              <div key={card.label} className={styles.heroMiniStat}>
                <span className={styles.heroMiniValue}>{card.value}</span>
                <span className={styles.heroMiniLabel}>{card.label}</span>
              </div>
            ))}
          </div>
        </section>

        {moreStats.length > 0 ? (
          <div className={styles.statsGrid}>
            {moreStats.map((card) => (
              <article key={card.label} className={styles.metricCard}>
                <p className={styles.metricValue}>{card.value}</p>
                <p className={styles.metricLabel}>{card.label}</p>
              </article>
            ))}
          </div>
        ) : null}

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

        <AdminQuickActions showJobApply={!isManager} />

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
          showJobApplyLinks={!isManager}
        />
      </main>
    </div>
  );
}
