"use client";

import { useState, useTransition } from "react";
import { sendCandidateMeetingLinkAction } from "@/server/actions/meeting-links";
import {
  CAREER_ADVISORY_US_TIMEZONE,
  formatDateTimeLocalInZone,
  parseDateTimeLocalInZone,
} from "@/lib/career-advisory/session-datetime";
import styles from "./mentor-meeting-link-form.module.css";

type MentorMeetingLinkFormProps = {
  candidateId: string;
  candidateEmail: string;
  existingMeetLink?: string | null;
  sessionScheduledAt?: string | null;
  inviteSentAt?: string | null;
  defaultMeetUrl?: string | null;
  compact?: boolean;
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatDateTimeLocalInZone(date, CAREER_ADVISORY_US_TIMEZONE);
}

function formatSentAt(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MentorMeetingLinkForm({
  candidateId,
  candidateEmail,
  existingMeetLink,
  sessionScheduledAt,
  inviteSentAt,
  defaultMeetUrl,
  compact = false,
}: MentorMeetingLinkFormProps) {
  const [pending, startTransition] = useTransition();
  const [meetUrl, setMeetUrl] = useState(existingMeetLink ?? defaultMeetUrl ?? "");
  const [sessionAt, setSessionAt] = useState(toDatetimeLocalValue(sessionScheduledAt));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState(existingMeetLink ?? null);
  const [sentAt, setSentAt] = useState(inviteSentAt ?? null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!sessionAt.trim()) {
      setError("Choose when the session is scheduled.");
      return;
    }

    const sessionStart = parseDateTimeLocalInZone(sessionAt, CAREER_ADVISORY_US_TIMEZONE);
    if (!sessionStart) {
      setError("Choose a valid session date and time (US Eastern).");
      return;
    }

    startTransition(async () => {
      const result = await sendCandidateMeetingLinkAction(
        candidateId,
        meetUrl.trim(),
        sessionStart.toISOString(),
      );

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSentLink(result.meetUrl);
      setSentAt(result.inviteSentAt);
      setMeetUrl(result.meetUrl);
      setMessage(`Meeting link emailed to ${candidateEmail}.`);
    });
  }

  return (
    <form className={compact ? styles.formCompact : styles.form} onSubmit={handleSubmit}>
      {!compact ? (
        <p className={styles.lead}>
          Send a Google Meet link to this candidate. They receive a calendar invite by email.
        </p>
      ) : null}

      <label className={styles.field}>
        <span className={styles.label}>Google Meet link</span>
        <input
          type="url"
          value={meetUrl}
          onChange={(event) => setMeetUrl(event.target.value)}
          placeholder="https://meet.google.com/..."
          className={styles.input}
          disabled={pending}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Session date & time (US Eastern)</span>
        <input
          type="datetime-local"
          value={sessionAt}
          onChange={(event) => setSessionAt(event.target.value)}
          className={styles.input}
          disabled={pending}
          required
        />
      </label>

      <div className={styles.actions}>
        <button type="submit" className={styles.sendBtn} disabled={pending}>
          {pending ? "Sending…" : sentLink ? "Resend meeting link" : "Send meeting link"}
        </button>
        {sentLink ? (
          <a
            href={sentLink}
            target="_blank"
            rel="noreferrer"
            className={styles.joinBtn}
          >
            Join Google Meet
          </a>
        ) : null}
      </div>

      {sentAt ? (
        <p className={styles.sentMeta}>Last sent {formatSentAt(sentAt)}</p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className={styles.success} role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
