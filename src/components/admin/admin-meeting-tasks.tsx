"use client";

import Link from "next/link";
import type { AdminMeetingTask } from "@/server/services/admin-dashboard";
import { formatDisplayName } from "@/lib/format-display-name";
import { MentorMeetingLinkForm } from "@/components/admin/mentor-meeting-link-form";
import styles from "@/app/admin/admin.module.css";

type AdminMeetingTasksProps = {
  tasks: AdminMeetingTask[];
  emptyMessage?: string;
  compact?: boolean;
  isMentor?: boolean;
  defaultMeetUrl?: string | null;
};

function formatSessionDateTime(value: string | null): string {
  if (!value) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function AdminMeetingTasks({
  tasks,
  emptyMessage = "No upcoming meetings scheduled.",
  compact = false,
  isMentor = false,
  defaultMeetUrl,
}: AdminMeetingTasksProps) {
  if (tasks.length === 0) {
    return <p className={styles.emptyInline}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.taskList}>
      {tasks.map((task) => {
        const displayName = formatDisplayName(task.candidateName);

        return (
          <li key={task.id} className={styles.taskItem}>
            <div className={styles.taskContent}>
              <p className={styles.taskTitle}>Meeting with {displayName}</p>
              <p className={styles.taskMeta}>
                {formatSessionDateTime(task.sessionScheduledAt)}
              </p>
              {!compact && (
                <p className={styles.taskMeta}>
                  {task.inviteSent ? "Invite sent" : "Invite pending"}
                </p>
              )}
              {isMentor && !compact && !task.inviteSent ? (
                <MentorMeetingLinkForm
                  candidateId={task.candidateId}
                  candidateEmail={task.candidateEmail}
                  existingMeetLink={task.googleMeetLink}
                  sessionScheduledAt={task.sessionScheduledAt}
                  inviteSentAt={task.inviteSentAt}
                  defaultMeetUrl={defaultMeetUrl}
                  compact
                />
              ) : null}
            </div>
            <div className={styles.taskActions}>
              {task.googleMeetLink ? (
                <a
                  href={task.googleMeetLink}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.meetLinkBtn}
                >
                  Join Google Meet
                </a>
              ) : null}
              {!compact && (
                <Link
                  href={`/admin/candidates#candidate-${task.candidateId}`}
                  className={styles.recentLink}
                >
                  View candidate
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
