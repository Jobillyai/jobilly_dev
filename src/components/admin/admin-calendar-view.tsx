import Link from "next/link";
import type { AdminCalendarSession } from "@/server/services/admin-dashboard";
import { formatDisplayName } from "@/lib/format-display-name";
import styles from "@/app/admin/admin.module.css";

type AdminCalendarSessionsProps = {
  title: string;
  sessions: AdminCalendarSession[];
  emptyMessage: string;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SessionTable({
  title,
  sessions,
  emptyMessage,
}: AdminCalendarSessionsProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {title} ({sessions.length})
      </h2>
      {sessions.length === 0 ? (
        <p className={styles.emptyInline}>{emptyMessage}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Branch</th>
                <th>Session</th>
                <th>Invite</th>
                <th>Google Meet</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <p className={styles.tablePrimary}>{formatDisplayName(session.name)}</p>
                    <p className={styles.tableSecondary}>{session.email}</p>
                  </td>
                  <td>{session.branch}</td>
                  <td>{formatDateTime(session.sessionScheduledAt)}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        session.inviteSentAt ? styles.badgeSubmitted : styles.badgePending
                      }`}
                    >
                      {session.inviteSentAt
                        ? `Sent ${formatDateTime(session.inviteSentAt)}`
                        : "Pending"}
                    </span>
                  </td>
                  <td>
                    {session.googleMeetLink ? (
                      <a
                        href={session.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.meetLinkBtn}
                      >
                        Join meeting
                      </a>
                    ) : (
                      <span className={styles.tableSecondary}>—</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/admin/candidates#candidate-${session.candidateId}`}
                      className={styles.recentLinkPrimary}
                    >
                      View candidate
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type AdminCalendarViewProps = {
  upcoming: AdminCalendarSession[];
  pendingInvites: AdminCalendarSession[];
  past: AdminCalendarSession[];
};

export function AdminCalendarView({
  upcoming,
  pendingInvites,
  past,
}: AdminCalendarViewProps) {
  const totalSessions = upcoming.length + pendingInvites.length + past.length;

  if (totalSessions === 0) {
    return (
      <div className={styles.emptyState}>
        No career advisory submissions yet. Sessions will appear here after candidates
        submit the form.
      </div>
    );
  }

  return (
    <div className={styles.calendarSections}>
      <SessionTable
        title="Upcoming sessions"
        sessions={upcoming}
        emptyMessage="No upcoming sessions scheduled."
      />
      <SessionTable
        title="Pending Meet invites"
        sessions={pendingInvites}
        emptyMessage="All submissions have received a Meet invite."
      />
      <SessionTable
        title="Past sessions"
        sessions={past}
        emptyMessage="No past sessions yet."
      />
    </div>
  );
}
