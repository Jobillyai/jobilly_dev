import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionMonthCalendar } from "@/components/calendar/session-month-calendar";
import { PortalDateLabel } from "@/components/layout/portal-date-label";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCareerAdvisoryIntakeForCandidate,
  mapIntakeToCalendarSessions,
} from "@/server/services/career-advisory-intake";
import { formatSessionDateTimeFromIso } from "@/lib/career-advisory/session-datetime";
import styles from "../dashboard.module.css";
import pageStyles from "./calendar.module.css";

function formatSessionDateTime(value: string | null): string {
  return formatSessionDateTimeFromIso(value, "candidate") ?? "Not scheduled yet";
}

export default async function CandidateCalendarPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const intake = await getCareerAdvisoryIntakeForCandidate(user.id);
  const sessions = mapIntakeToCalendarSessions(intake);

  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${pageStyles.main}`}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>Student portal</p>
            <h1 className={styles.title}>My calendar</h1>
            <p className={pageStyles.subtitle}>
              View your career advisory sessions and join Google Meet from your calendar.
            </p>
          </div>
        </header>

        <PortalDateLabel />

        {intake?.sessionScheduledAt && (
          <div className={pageStyles.nextSessionCard}>
            <p className={pageStyles.nextSessionLabel}>Next session</p>
            <p className={pageStyles.nextSessionTime}>
              {formatSessionDateTime(intake.sessionScheduledAt)}
            </p>
            {intake.googleMeetLink ? (
              <a
                href={intake.googleMeetLink}
                target="_blank"
                rel="noreferrer"
                className={pageStyles.meetLinkBtn}
              >
                Join Google Meet
              </a>
            ) : null}
          </div>
        )}

        <SessionMonthCalendar
          sessions={sessions}
          ariaLabel="My career advisory calendar"
          emptyMessage="No sessions booked yet. Submit the career advisory form to schedule your first session."
        />

        {!intake && (
          <p className={pageStyles.ctaRow}>
            <Link href="/dashboard/career-advisory" className={pageStyles.ctaLink}>
              Book a career advisory session
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
