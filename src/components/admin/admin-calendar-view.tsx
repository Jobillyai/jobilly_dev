"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminCalendarSession } from "@/server/services/admin-dashboard";
import { formatDisplayName } from "@/lib/format-display-name";
import {
  buildMonthGrid,
  formatMonthLabel,
  getSessionDateKey,
} from "@/lib/calendar/month-grid";
import styles from "@/app/admin/admin.module.css";

type CalendarSession = AdminCalendarSession & {
  status: "upcoming" | "pending" | "past";
};

type AdminCalendarViewProps = {
  upcoming: AdminCalendarSession[];
  pendingInvites: AdminCalendarSession[];
  past: AdminCalendarSession[];
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatEventTime(value: string | null): string {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergeSessions(
  upcoming: AdminCalendarSession[],
  pendingInvites: AdminCalendarSession[],
  past: AdminCalendarSession[],
): CalendarSession[] {
  return [
    ...upcoming.map((session) => ({ ...session, status: "upcoming" as const })),
    ...pendingInvites.map((session) => ({ ...session, status: "pending" as const })),
    ...past.map((session) => ({ ...session, status: "past" as const })),
  ];
}

function groupSessionsByDay(sessions: CalendarSession[]): Map<string, CalendarSession[]> {
  const grouped = new Map<string, CalendarSession[]>();

  for (const session of sessions) {
    const dateKey = getSessionDateKey(session.sessionScheduledAt, session.createdAt);
    const existing = grouped.get(dateKey) ?? [];
    existing.push(session);
    grouped.set(dateKey, existing);
  }

  for (const daySessions of grouped.values()) {
    daySessions.sort((a, b) => {
      const aTime = new Date(a.sessionScheduledAt ?? a.createdAt).getTime();
      const bTime = new Date(b.sessionScheduledAt ?? b.createdAt).getTime();
      return aTime - bTime;
    });
  }

  return grouped;
}

function eventStatusClass(status: CalendarSession["status"]): string {
  if (status === "upcoming") {
    return styles.calendarEventUpcoming ?? "";
  }

  if (status === "pending") {
    return styles.calendarEventPending ?? "";
  }

  return styles.calendarEventPast ?? "";
}

export function AdminCalendarView({
  upcoming,
  pendingInvites,
  past,
}: AdminCalendarViewProps) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const allSessions = useMemo(
    () => mergeSessions(upcoming, pendingInvites, past),
    [upcoming, pendingInvites, past],
  );

  const sessionsByDay = useMemo(() => groupSessionsByDay(allSessions), [allSessions]);

  const monthDays = useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.month),
    [visibleMonth.year, visibleMonth.month],
  );

  function goToPreviousMonth() {
    setVisibleMonth((current) => {
      const date = new Date(current.year, current.month - 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function goToNextMonth() {
    setVisibleMonth((current) => {
      const date = new Date(current.year, current.month + 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function goToToday() {
    const now = new Date();
    setVisibleMonth({ year: now.getFullYear(), month: now.getMonth() });
  }

  return (
    <section className={styles.calendarPanel}>
      <div className={styles.calendarToolbar}>
        <div className={styles.calendarToolbarLeft}>
          <button
            type="button"
            className={styles.calendarNavBtn}
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className={styles.calendarMonthLabel}>
            {formatMonthLabel(visibleMonth.year, visibleMonth.month)}
          </h2>
          <button
            type="button"
            className={styles.calendarNavBtn}
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <button type="button" className={styles.calendarTodayBtn} onClick={goToToday}>
          Today
        </button>
      </div>

      <div className={styles.calendarWeekdays} aria-hidden>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.calendarWeekday}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.calendarGrid} role="grid" aria-label="Career advisory calendar">
        {monthDays.map((day) => {
          const daySessions = sessionsByDay.get(day.dateKey) ?? [];
          const visibleEvents = daySessions.slice(0, 3);
          const hiddenCount = daySessions.length - visibleEvents.length;

          return (
            <div
              key={day.dateKey}
              role="gridcell"
              className={`${styles.calendarDayCell} ${
                day.isCurrentMonth ? "" : styles.calendarDayCellOutside
              } ${day.isToday ? styles.calendarDayCellToday : ""}`}
            >
              <div className={styles.calendarDayHeader}>
                <span className={styles.calendarDayNumber}>{day.date.getDate()}</span>
              </div>

              <div className={styles.calendarDayEvents}>
                {visibleEvents.map((session) => {
                  const label = formatDisplayName(session.name);
                  const content = (
                    <>
                      <span className={styles.calendarEventTime}>
                        {formatEventTime(session.sessionScheduledAt)}
                      </span>
                      <span className={styles.calendarEventName}>{label}</span>
                    </>
                  );

                  if (session.googleMeetLink) {
                    return (
                      <a
                        key={session.id}
                        href={session.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className={`${styles.calendarEvent} ${eventStatusClass(session.status)}`}
                        title={`Meeting with ${label}`}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={session.id}
                      href={`/admin/candidates#candidate-${session.candidateId}`}
                      className={`${styles.calendarEvent} ${eventStatusClass(session.status)}`}
                      title={`View ${label}`}
                    >
                      {content}
                    </Link>
                  );
                })}

                {hiddenCount > 0 && (
                  <span className={styles.calendarMoreEvents}>+{hiddenCount} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.calendarLegend}>
        <span className={styles.calendarLegendItem}>
          <span
            className={`${styles.calendarLegendDot} ${styles.calendarEventUpcoming}`}
          />
          Upcoming
        </span>
        <span className={styles.calendarLegendItem}>
          <span
            className={`${styles.calendarLegendDot} ${styles.calendarEventPending}`}
          />
          Pending invite
        </span>
        <span className={styles.calendarLegendItem}>
          <span className={`${styles.calendarLegendDot} ${styles.calendarEventPast}`} />
          Past
        </span>
      </div>

      {allSessions.length === 0 && (
        <p className={styles.calendarEmptyHint}>
          No career advisory sessions yet. Bookings will appear on the calendar after
          candidates submit the form.
        </p>
      )}
    </section>
  );
}
