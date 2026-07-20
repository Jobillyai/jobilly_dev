"use client";

import { useMemo, useState, useTransition } from "react";
import {
  closeCareerAdvisoryServiceRequestAction,
  assignServiceRequestAction,
  updateServiceRequestStatusAction,
} from "@/server/actions/service-requests";
import { formatSessionDateTimeFromIso } from "@/lib/career-advisory/session-datetime";
import type {
  MentorOption,
  ServiceRequestRow,
} from "@/server/services/service-requests";
import styles from "./service-requests-panel.module.css";

type ServiceRequestsPanelProps = {
  requests: ServiceRequestRow[];
  mentors: MentorOption[];
  isManager: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function requestTypeLabel(type: ServiceRequestRow["requestType"]): string {
  if (type === "new_candidate") {
    return "New signup";
  }
  if (type === "career_advisory") {
    return "Career advisory";
  }
  return "Contact";
}

function statusLabel(status: ServiceRequestRow["status"]): string {
  if (status === "open") {
    return "Open";
  }
  if (status === "assigned") {
    return "Assigned";
  }
  return "Closed";
}

export function ServiceRequestsPanel({
  requests,
  mentors,
  isManager,
}: ServiceRequestsPanelProps) {
  const [rows, setRows] = useState(requests);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");
  const [pending, startTransition] = useTransition();
  const [selectedMentor, setSelectedMentor] = useState<Record<string, string>>(
    {},
  );
  const [meetingRemarks, setMeetingRemarks] = useState<Record<string, string>>(
    {},
  );

  const openCount = useMemo(
    () => rows.filter((row) => row.status === "open").length,
    [rows],
  );
  const newSignupCount = useMemo(
    () =>
      rows.filter(
        (row) => row.requestType === "new_candidate" && row.status === "open",
      ).length,
    [rows],
  );
  const advisoryCount = useMemo(
    () => rows.filter((row) => row.requestType === "career_advisory").length,
    [rows],
  );

  function handleAssign(requestId: string) {
    const mentorId = selectedMentor[requestId];
    if (!mentorId) {
      setMessageKind("error");
      setMessage("Choose a mentor before assigning.");
      return;
    }

    startTransition(async () => {
      const result = await assignServiceRequestAction(requestId, mentorId);
      if (result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      const assignedRequest = rows.find((row) => row.id === requestId);
      const mentor = mentors.find((entry) => entry.id === mentorId);
      setRows((current) =>
        current.map((row) =>
          row.id === requestId
            ? {
                ...row,
                status: "assigned",
                assignedMentorId: mentorId,
                assignedMentorName: mentor?.name ?? null,
                assignedMentorEmail: mentor?.email ?? null,
                assignedAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      setMessageKind("success");
      if (result.meetInviteSent) {
        setMessage(
          result.meetInviteMessage ??
            "Mentor assigned. Meet invite emailed to the candidate.",
        );
      } else if (result.meetInviteMessage) {
        setMessageKind("error");
        setMessage(result.meetInviteMessage);
      } else {
        setMessage(
          assignedRequest?.requestType === "new_candidate"
            ? "Mentor assigned. The candidate is now linked to this mentor admin."
            : assignedRequest?.requestType === "career_advisory"
              ? "Mentor assigned for the career advisory session."
              : "Request assigned to mentor.",
        );
      }
    });
  }

  function handleClose(requestId: string) {
    startTransition(async () => {
      const result = await updateServiceRequestStatusAction(requestId, "closed");
      if (result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      setRows((current) =>
        current.map((row) =>
          row.id === requestId ? { ...row, status: "closed" } : row,
        ),
      );
      setMessageKind("success");
      setMessage("Request marked as closed.");
    });
  }

  function handleCloseAdvisory(requestId: string) {
    const remarks = meetingRemarks[requestId]?.trim() ?? "";
    if (remarks.length < 10) {
      setMessageKind("error");
      setMessage("Add meeting remarks (at least a few sentences) before closing.");
      return;
    }

    startTransition(async () => {
      const result = await closeCareerAdvisoryServiceRequestAction(
        requestId,
        remarks,
      );
      if (result.error) {
        setMessageKind("error");
        setMessage(result.error);
        return;
      }

      setRows((current) =>
        current.map((row) =>
          row.id === requestId
            ? {
                ...row,
                status: "closed",
                meetingRemarks: remarks,
                submittedToManagerAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      setMessageKind("success");
      setMessage("Session closed and meeting remarks sent to your manager.");
    });
  }

  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        {isManager
          ? "No requests yet. New candidate signups, career advisory bookings without a mentor, and contact form submissions will appear here."
          : "No career advisory bookings assigned to you yet. When a candidate on your roster books a session, it will appear here."}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {isManager ? (
        <p className={styles.summary}>
          {rows.length} request{rows.length === 1 ? "" : "s"} · {openCount} open
          {newSignupCount > 0
            ? ` · ${newSignupCount} new signup${newSignupCount === 1 ? "" : "s"} need mentor`
            : ""}
        </p>
      ) : (
        <p className={styles.summary}>
          {advisoryCount} career advisory booking{advisoryCount === 1 ? "" : "s"}{" "}
          assigned to you
        </p>
      )}

      {message ? (
        <p
          role={messageKind === "error" ? "alert" : "status"}
          className={messageKind === "error" ? styles.error : styles.success}
        >
          {message}
        </p>
      ) : null}

      <div className={styles.list}>
        {rows.map((request) => {
          const sessionLabel = request.sessionScheduledAt
            ? formatSessionDateTimeFromIso(request.sessionScheduledAt, "staff")
            : null;

          return (
            <article key={request.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.titleRow}>
                    <h3 className={styles.name}>
                      {request.firstName} {request.lastName}
                    </h3>
                    <span
                      className={`${styles.badge} ${
                        request.requestType === "new_candidate"
                          ? styles.badgeSignup
                          : request.requestType === "career_advisory"
                            ? styles.badgeAdvisory
                            : styles.badgeContact
                      }`}
                    >
                      {requestTypeLabel(request.requestType)}
                    </span>
                  </div>
                  <p className={styles.meta}>
                    {request.email}
                    {request.requestType === "contact" ? ` · ${request.phone}` : ""}
                  </p>
                  {sessionLabel ? (
                    <p className={styles.meta}>
                      Session: <strong>{sessionLabel}</strong>
                    </p>
                  ) : null}
                  <p className={styles.metaMuted}>
                    Submitted {formatDate(request.createdAt)}
                  </p>
                </div>
                <span
                  className={`${styles.badge} ${
                    request.status === "open"
                      ? styles.badgeOpen
                      : request.status === "assigned"
                        ? styles.badgeAssigned
                        : styles.badgeClosed
                  }`}
                >
                  {statusLabel(request.status)}
                </span>
              </div>

              <p className={styles.enquiry}>{request.enquiry}</p>

              {request.assignedMentorId ? (
                <p className={styles.assignee}>
                  Assigned to:{" "}
                  <strong>
                    {request.assignedMentorName || request.assignedMentorEmail}
                  </strong>
                  {request.assignedAt
                    ? ` · ${formatDate(request.assignedAt)}`
                    : ""}
                </p>
              ) : null}

              {request.meetingRemarks ? (
                <div className={styles.remarksBlock}>
                  <p className={styles.remarksLabel}>Meeting remarks</p>
                  <p className={styles.remarksText}>{request.meetingRemarks}</p>
                  {request.submittedToManagerAt ? (
                    <p className={styles.metaMuted}>
                      Sent to manager {formatDate(request.submittedToManagerAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isManager && request.status !== "closed" ? (
                <div className={styles.actions}>
                  <select
                    value={selectedMentor[request.id] ?? request.assignedMentorId ?? ""}
                    onChange={(event) =>
                      setSelectedMentor((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    className={styles.select}
                    disabled={pending}
                    aria-label={`Assign mentor for ${request.firstName}`}
                  >
                    <option value="">Assign mentor…</option>
                    {mentors.map((mentor) => (
                      <option key={mentor.id} value={mentor.id}>
                        {mentor.name} ({mentor.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => handleAssign(request.id)}
                    disabled={pending}
                  >
                    Assign
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => handleClose(request.id)}
                    disabled={pending}
                  >
                    Close
                  </button>
                </div>
              ) : null}

              {!isManager &&
              request.requestType === "career_advisory" &&
              request.status === "assigned" ? (
                <div className={styles.mentorCloseBlock}>
                  <label className={styles.remarksFieldLabel} htmlFor={`remarks-${request.id}`}>
                    Meeting remarks for your manager
                  </label>
                  <textarea
                    id={`remarks-${request.id}`}
                    className={styles.remarksInput}
                    rows={4}
                    value={meetingRemarks[request.id] ?? ""}
                    onChange={(event) =>
                      setMeetingRemarks((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    placeholder="Summarize what you covered, recommended next steps, and any follow-ups."
                    disabled={pending}
                  />
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => handleCloseAdvisory(request.id)}
                      disabled={pending}
                    >
                      Mark closed & send to manager
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
