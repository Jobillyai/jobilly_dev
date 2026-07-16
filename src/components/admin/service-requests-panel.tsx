"use client";

import { useMemo, useState, useTransition } from "react";
import {
  assignServiceRequestAction,
  updateServiceRequestStatusAction,
} from "@/server/actions/service-requests";
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

  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        {isManager
          ? "No requests yet. New candidate signups and contact form submissions will appear here."
          : "No requests assigned to you yet."}
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
      ) : null}

      {message ? (
        <p
          role={messageKind === "error" ? "alert" : "status"}
          className={messageKind === "error" ? styles.error : styles.success}
        >
          {message}
        </p>
      ) : null}

      <div className={styles.list}>
        {rows.map((request) => (
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

            {!isManager && request.status === "assigned" ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => handleClose(request.id)}
                  disabled={pending}
                >
                  Mark closed
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
