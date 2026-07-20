"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { assignCandidateToMentorAction } from "@/server/actions/service-requests";
import type { AdminCandidate } from "@/server/services/admin-dashboard";
import type { MentorOption } from "@/server/services/service-requests";
import { formatDisplayName } from "@/lib/format-display-name";
import { formatExperienceYears } from "@/lib/format-experience-years";
import {
  formatCandidateGender,
  formatCandidateVisaStatus,
} from "@/lib/candidate-profile-options";
import { getPremiumPlan } from "@/lib/candidate-services";
import { resolveCandidateJobRole } from "@/server/services/candidate-job-role";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import { formatSessionDateTimeFromIso } from "@/lib/career-advisory/session-datetime";
import styles from "./candidates-list.module.css";

type CandidatesListProps = {
  candidates: AdminCandidate[];
  mentors: MentorOption[];
  isManager: boolean;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSessionDate(value: string | null): string {
  return formatSessionDateTimeFromIso(value, "staff") ?? "—";
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type CandidateRowProps = {
  candidate: AdminCandidate;
  expanded: boolean;
  onToggle: () => void;
  isManager: boolean;
  mentors: MentorOption[];
  assignedMentorId: string | null;
  onAssigned: (candidateId: string, mentorId: string) => void;
};

function CandidateRow({
  candidate,
  expanded,
  onToggle,
  isManager,
  mentors,
  assignedMentorId,
  onAssigned,
}: CandidateRowProps) {
  const [pending, startTransition] = useTransition();
  const [selectedMentorId, setSelectedMentorId] = useState(assignedMentorId ?? "");
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const displayName = candidate.name
    ? formatDisplayName(candidate.name)
    : formatDisplayName(candidate.email.split("@")[0] ?? candidate.email);
  const submission = candidate.submission;
  const detailsId = `candidate-details-${candidate.id}`;
  const assignedMentor = mentors.find((mentor) => mentor.id === assignedMentorId);
  const planLabel = candidate.subscriptionPlan
    ? getPremiumPlan(candidate.subscriptionPlan)?.shortLabel
    : "Free tier";

  function handleAssign() {
    if (!selectedMentorId) {
      setAssignError("Choose a mentor before assigning.");
      setAssignMessage(null);
      return;
    }

    startTransition(async () => {
      setAssignError(null);
      setAssignMessage(null);
      const result = await assignCandidateToMentorAction(candidate.id, selectedMentorId);
      if (result.error) {
        setAssignError(result.error);
        return;
      }

      onAssigned(candidate.id, selectedMentorId);
      if (result.meetInviteSent) {
        setAssignMessage(
          result.meetInviteMessage ??
            "Mentor assigned. Meet invite emailed to the candidate.",
        );
      } else if (result.meetInviteMessage) {
        setAssignError(result.meetInviteMessage);
        setAssignMessage("Mentor assigned.");
      } else {
        setAssignMessage("Mentor assigned.");
      }
    });
  }

  return (
    <article
      id={`candidate-${candidate.id}`}
      className={`${styles.item} ${expanded ? styles.itemExpanded : ""}`}
    >
      <div className={styles.summaryRow}>
        <div className={styles.summaryText}>
          <h3 className={styles.name}>{displayName}</h3>
          <p className={styles.metaLine}>
            {candidate.memberId ? (
              <>
                <MemberIdBadge memberId={candidate.memberId} size="sm" />
                {" · "}
              </>
            ) : null}
            {candidate.email} · {formatRole(candidate.role)}
          </p>
          <p className={styles.metaMuted}>Registered {formatDate(candidate.createdAt)}</p>
          <p className={styles.roleMeta}>
            Target role: {resolveCandidateJobRole(candidate) || "—"}
            {" · "}
            Years exp.: {formatExperienceYears(candidate.experienceYears) || "—"}
          </p>
          <p className={styles.roleMeta}>
            Candidate plan: <strong>{planLabel}</strong>
            {" · "}
            Managed applications:{" "}
            <strong>{candidate.hasManagedApplications ? "Eligible" : "Not included"}</strong>
          </p>
          {isManager ? (
            <p className={styles.mentorMeta}>
              Mentor:{" "}
              <strong>
                {assignedMentor ? assignedMentor.name : "Not assigned yet"}
              </strong>
            </p>
          ) : null}
        </div>

        <div className={styles.summaryActions}>
          {isManager && !assignedMentorId ? (
            <span className={`${styles.badge} ${styles.badgeNeedsMentor}`}>
              Needs mentor
            </span>
          ) : null}
          <span
            className={`${styles.badge} ${
              submission ? styles.badgeSubmitted : styles.badgePending
            }`}
          >
            {submission ? "Advisory submitted" : "No submission"}
          </span>
          <button
            type="button"
            className={styles.moreBtn}
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
          >
            {expanded ? "Less" : "More"}
            <ChevronDown
              size={16}
              aria-hidden
              className={expanded ? styles.moreIconOpen : styles.moreIcon}
            />
          </button>
        </div>
      </div>

      {isManager ? (
        <div className={styles.assignRow}>
          <select
            value={selectedMentorId}
            onChange={(event) => {
              setSelectedMentorId(event.target.value);
              setAssignError(null);
              setAssignMessage(null);
            }}
            className={styles.assignSelect}
            disabled={pending || mentors.length === 0}
            aria-label={`Assign mentor for ${displayName}`}
          >
            <option value="">
              {mentors.length === 0 ? "No mentor admins available" : "Assign mentor…"}
            </option>
            {mentors.map((mentor) => (
              <option key={mentor.id} value={mentor.id}>
                {mentor.name} ({mentor.email})
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.assignBtn}
            onClick={handleAssign}
            disabled={pending || mentors.length === 0}
          >
            {pending ? "Assigning…" : assignedMentorId ? "Update mentor" : "Assign mentor"}
          </button>
          {assignError ? (
            <p className={styles.assignError} role="alert">
              {assignError}
            </p>
          ) : null}
          {assignMessage ? (
            <p className={styles.assignSuccess} role="status">
              {assignMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        <div id={detailsId} className={styles.details}>
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Profile</h4>
            <dl className={styles.detailGrid}>
              {candidate.memberId ? (
                <>
                  <dt>Candidate ID</dt>
                  <dd>
                    <MemberIdBadge memberId={candidate.memberId} size="sm" />
                  </dd>
                </>
              ) : null}
              {isManager ? (
                <>
                  <dt>Assigned mentor</dt>
                  <dd>{assignedMentor ? assignedMentor.name : "Not assigned"}</dd>
                </>
              ) : null}
              {candidate.gender ? (
                <>
                  <dt>Gender</dt>
                  <dd>{formatCandidateGender(candidate.gender)}</dd>
                </>
              ) : null}
              {candidate.graduationCollege ? (
                <>
                  <dt>Graduation college</dt>
                  <dd>{candidate.graduationCollege}</dd>
                </>
              ) : null}
              {candidate.graduationYear ? (
                <>
                  <dt>Graduated year</dt>
                  <dd>{candidate.graduationYear}</dd>
                </>
              ) : null}
              {candidate.specialization ? (
                <>
                  <dt>Specialization</dt>
                  <dd>{candidate.specialization}</dd>
                </>
              ) : null}
              {candidate.location ? (
                <>
                  <dt>Location</dt>
                  <dd>{candidate.location}</dd>
                </>
              ) : null}
              {candidate.visaStatus ? (
                <>
                  <dt>Visa status</dt>
                  <dd>{formatCandidateVisaStatus(candidate.visaStatus)}</dd>
                </>
              ) : null}
              {candidate.profileEducation ? (
                <>
                  <dt>Education summary</dt>
                  <dd>{candidate.profileEducation}</dd>
                </>
              ) : null}
              {candidate.experienceYears != null ? (
                <>
                  <dt>Years of experience</dt>
                  <dd>{formatExperienceYears(candidate.experienceYears)}</dd>
                </>
              ) : null}
              {candidate.workExperience ? (
                <>
                  <dt>Work experience</dt>
                  <dd className={styles.detailWide}>{candidate.workExperience}</dd>
                </>
              ) : null}
              {candidate.careerGoals ? (
                <>
                  <dt>Career goals</dt>
                  <dd className={styles.detailWide}>{candidate.careerGoals}</dd>
                </>
              ) : null}
              {candidate.linkedinUrl ? (
                <>
                  <dt>LinkedIn</dt>
                  <dd>
                    <a
                      href={candidate.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.detailLink}
                    >
                      {candidate.linkedinUrl}
                    </a>
                  </dd>
                </>
              ) : null}
              <dt>Resume</dt>
              <dd>
                {candidate.resumeDownloadUrl ? (
                  <a
                    href={candidate.resumeDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.detailLink}
                  >
                    View {candidate.resumeFileName ?? "resume"}
                  </a>
                ) : candidate.resumeUrl ? (
                  "On file — download link unavailable"
                ) : (
                  "Not uploaded"
                )}
              </dd>
            </dl>
          </section>

          {submission ? (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Education & advisory details</h4>
              <dl className={styles.detailGrid}>
                <dt>Highest degree</dt>
                <dd>{submission.graduationDetails}</dd>
                <dt>Branch</dt>
                <dd>{submission.branch}</dd>
                <dt>Phone</dt>
                <dd>{submission.phone}</dd>
                <dt>Interested technology</dt>
                <dd className={styles.detailWide}>{submission.interestedTechnology}</dd>
                <dt>Submitted</dt>
                <dd>{formatDate(submission.createdAt)}</dd>
                <dt>Invite status</dt>
                <dd>
                  {submission.inviteSentAt
                    ? `Sent ${formatDate(submission.inviteSentAt)}`
                    : "Pending"}
                </dd>
                {submission.sessionScheduledAt ? (
                  <>
                    <dt>Session scheduled</dt>
                    <dd>{formatSessionDate(submission.sessionScheduledAt)}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          ) : (
            <p className={styles.noSubmission}>
              This candidate has not submitted the career advisory form yet.
            </p>
          )}

        </div>
      ) : null}
    </article>
  );
}

export function CandidatesList({
  candidates,
  mentors,
  isManager,
}: CandidatesListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [assignedByCandidate, setAssignedByCandidate] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      candidates
        .filter((candidate) => candidate.assignedEmployeeId)
        .map((candidate) => [candidate.id, candidate.assignedEmployeeId as string]),
    ),
  );

  if (candidates.length === 0) {
    return <div className={styles.emptyState}>No registered candidates yet.</div>;
  }

  const withSubmissions = candidates.filter((candidate) => candidate.submission);
  const withoutSubmissions = candidates.length - withSubmissions.length;
  const unassignedCount = candidates.filter(
    (candidate) => !assignedByCandidate[candidate.id],
  ).length;

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className={styles.list}>
      <p className={styles.summaryLine}>
        {candidates.length} candidate{candidates.length === 1 ? "" : "s"} ·{" "}
        {withSubmissions.length} with advisory submission
        {withSubmissions.length === 1 ? "" : "s"}
        {withoutSubmissions > 0 ? ` · ${withoutSubmissions} without submission` : ""}
        {isManager && unassignedCount > 0
          ? ` · ${unassignedCount} need mentor assignment`
          : ""}
      </p>

      {candidates.map((candidate) => (
        <CandidateRow
          key={candidate.id}
          candidate={candidate}
          expanded={expandedIds.has(candidate.id)}
          onToggle={() => toggleExpanded(candidate.id)}
          isManager={isManager}
          mentors={mentors}
          assignedMentorId={assignedByCandidate[candidate.id] ?? null}
          onAssigned={(candidateId, mentorId) => {
            setAssignedByCandidate((current) => ({
              ...current,
              [candidateId]: mentorId,
            }));
          }}
        />
      ))}
    </div>
  );
}
