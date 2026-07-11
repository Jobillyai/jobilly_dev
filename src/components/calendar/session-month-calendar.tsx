"use client";

import { useMemo, useState } from "react";
import {
  buildMonthGrid,
  formatMonthLabel,
  getSessionDateKey,
} from "@/lib/calendar/month-grid";
import { CAREER_ADVISORY_US_TIMEZONE } from "@/lib/career-advisory/session-datetime";
import styles from "./session-month-calendar.module.css";

export type SessionCalendarEvent = {
  id: string;
  title: string;
  sessionScheduledAt: string | null;
  bookedAt: string;
  status: "upcoming" | "pending" | "past" | "invited";
  meetLink?: string | null;
};

type SessionMonthCalendarProps = {
  sessions: SessionCalendarEvent[];
  emptyMessage: string;
  ariaLabel?: string;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatEventTime(value: string | null): string {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CAREER_ADVISORY_US_TIMEZONE,
    timeZoneName: "short",
  }).format(new Date(value));
}

function groupSessionsByDay(
  sessions: SessionCalendarEvent[],
): Map<string, SessionCalendarEvent[]> {
  const grouped = new Map<string, SessionCalendarEvent[]>();

  for (const session of sessions) {
    const dateKey = getSessionDateKey(session.sessionScheduledAt, session.bookedAt);
    const existing = grouped.get(dateKey) ?? [];
    existing.push(session);
    grouped.set(dateKey, existing);
  }

  for (const daySessions of grouped.values()) {
    daySessions.sort((a, b) => {
      const aTime = new Date(a.sessionScheduledAt ?? a.bookedAt).getTime();
      const bTime = new Date(b.sessionScheduledAt ?? b.bookedAt).getTime();
      return aTime - bTime;
    });
  }

  return grouped;
}

function eventStatusClass(status: SessionCalendarEvent["status"]): string {
  if (status === "upcoming") {
    return styles.calendarEventUpcoming ?? "";
  }

  if (status === "invited") {
    return styles.calendarEventInvited ?? "";
  }

  if (status === "pending") {
    return styles.calendarEventPending ?? "";
  }

  return styles.calendarEventPast ?? "";
}

export function SessionMonthCalendar({
  sessions,
  emptyMessage,
  ariaLabel = "Session calendar",
}: SessionMonthCalendarProps) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const sessionsByDay = useMemo(() => groupSessionsByDay(sessions), [sessions]);

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
    <section className={styles.sessionCalendarPanel}>
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

      <div className={styles.calendarGrid} role="grid" aria-label={ariaLabel}>
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
                  const content = (
                    <>
                      <span className={styles.calendarEventTime}>
                        {formatEventTime(session.sessionScheduledAt)}
                      </span>
                      <span className={styles.calendarEventName}>{session.title}</span>
                    </>
                  );

                  if (session.meetLink) {
                    return (
                      <a
                        key={session.id}
                        href={session.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className={`${styles.calendarEvent} ${eventStatusClass(session.status)}`}
                        title={`Join ${session.title}`}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <div
                      key={session.id}
                      className={`${styles.calendarEvent} ${eventStatusClass(session.status)}`}
                      title={session.title}
                    >
                      {content}
                    </div>
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

      {sessions.length === 0 && (
        <p className={styles.calendarEmptyHint}>{emptyMessage}</p>
      )}
    </section>
  );
}
