"use client";

import { useState, useTransition } from "react";
import { submitAdminDailyUpdateAction } from "@/server/actions/daily-update";
import type {
  AdminDailyUpdate,
  DailyActivitySnapshot,
} from "@/server/services/admin-daily-updates";
import { AdminDailyActivityList } from "@/components/admin/admin-daily-activity-list";
import styles from "./admin-daily-tasks.module.css";

type AdminDailyTasksFormProps = {
  workDate: string;
  activity: DailyActivitySnapshot;
  existingUpdate: AdminDailyUpdate | null;
};

function formatWorkDate(workDate: string): string {
  const [year, month, day] = workDate.split("-").map(Number);
  if (!year || !month || !day) {
    return workDate;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(year, month - 1, day));
}

function formatSubmittedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function AdminDailyTasksForm({
  workDate,
  activity,
  existingUpdate,
}: AdminDailyTasksFormProps) {
  const [remarks, setRemarks] = useState(existingUpdate?.remarks ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [submittedAt, setSubmittedAt] = useState(existingUpdate?.submittedAt ?? null);
  const [isPending, startTransition] = useTransition();

  const displayActivity = existingUpdate?.activitySnapshot ?? activity;
  const { summary } = displayActivity;

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const result = await submitAdminDailyUpdateAction(remarks);
      if ("error" in result && result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      if ("success" in result && result.success) {
        setMessageKind("success");
        setSubmittedAt(result.submittedAt);
        setMessage(
          result.isUpdate
            ? "Daily update revised and sent to your manager."
            : "Daily update sent to your manager.",
        );
      }
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>Today&apos;s work log</p>
          <h2 className={styles.panelTitle}>{formatWorkDate(workDate)}</h2>
          <p className={styles.panelSubtitle}>
            Activity is pulled automatically from jobs you scraped, applications you submitted,
            and advisory invites you sent today (IST).
          </p>
        </div>
        {submittedAt ? (
          <span className={styles.submittedBadge}>
            Sent {formatSubmittedAt(submittedAt)}
          </span>
        ) : (
          <span className={styles.pendingBadge}>Not sent yet</span>
        )}
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.jobsScraped}</span>
          <span className={styles.summaryLabel}>Jobs found</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.applicationsSubmitted}</span>
          <span className={styles.summaryLabel}>Applications</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.meetInvitesSent}</span>
          <span className={styles.summaryLabel}>Invites sent</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{summary.meetingsHeld}</span>
          <span className={styles.summaryLabel}>Sessions held</span>
        </div>
      </div>

      <section className={styles.sectionBlock}>
        <h3 className={styles.sectionHeading}>What you did today</h3>
        <AdminDailyActivityList items={displayActivity.items} />
      </section>

      <section className={styles.sectionBlock}>
        <label htmlFor="dailyRemarks" className={styles.sectionHeading}>
          Remarks for your manager
        </label>
        <p className={styles.remarksHint}>
          Summarize blockers, follow-ups, or anything not captured above. This is included when
          you send the update.
        </p>
        <textarea
          id="dailyRemarks"
          className={styles.remarksInput}
          rows={5}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="e.g. Followed up with 3 candidates on shortlists. Waiting on resume from Alex for senior roles."
          disabled={isPending}
        />
      </section>

      {message ? (
        <p
          className={
            messageKind === "error" ? styles.feedbackError : styles.feedbackSuccess
          }
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isPending || remarks.trim().length < 3}
        >
          {isPending
            ? "Sending…"
            : submittedAt
              ? "Update and resend to manager"
              : "Send update to manager"}
        </button>
      </div>
    </div>
  );
}
