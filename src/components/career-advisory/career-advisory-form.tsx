"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  submitCareerAdvisoryAction,
  type CareerAdvisoryState,
} from "@/server/actions/career-advisory";
import { uploadProfileResumeAction } from "@/server/actions/profile";
import type { CandidateCareerAdvisoryIntake } from "@/server/services/career-advisory-intake";
import {
  CAREER_ADVISORY_US_TIMEZONE,
  formatDateTimeLocalInZone,
  formatSessionDateTimeFromIso,
} from "@/lib/career-advisory/session-datetime";
import { PersonNameFields } from "@/components/auth/person-name-fields";
import { PhoneField } from "@/components/auth/phone-field";
import { FormField } from "@/components/auth/form-field";
import { splitFullName } from "@/lib/format-person-name";
import { SubmitButton } from "@/components/auth/submit-button";
import { SessionBookingPicker } from "@/components/career-advisory/session-booking-picker";
import authStyles from "@/components/auth/auth-page.module.css";
import dashboardStyles from "@/app/dashboard/dashboard.module.css";
import styles from "./career-advisory-form.module.css";

const HIGHEST_DEGREE_OPTIONS = [
  "PhD / Doctorate",
  "MS (Master of Science)",
  "MBA",
  "M.Tech",
  "MCA",
  "MA / M.Com",
  "B.Tech / B.E.",
  "BSc / BCA",
  "BBA / B.Com / BA",
  "Diploma",
  "Other",
] as const;

type CareerAdvisoryFormProps = {
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultEmail?: string;
  existingIntake?: CandidateCareerAdvisoryIntake | null;
  initialResumeFileName?: string | null;
  initialResumePreviewUrl?: string | null;
};

function formatSessionLabel(value: string | null | undefined) {
  return formatSessionDateTimeFromIso(value, "candidate");
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sessionDefaultValue(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return formatDateTimeLocalInZone(date, CAREER_ADVISORY_US_TIMEZONE);
}

function PreviousSubmissionPanel({ intake }: { intake: CandidateCareerAdvisoryIntake }) {
  const sessionLabel = formatSessionLabel(intake.sessionScheduledAt);

  return (
    <section className={styles.previousSubmission} aria-label="Previous submission">
      <div className={styles.previousSubmissionHeader}>
        <p className={styles.previousSubmissionLabel}>Your latest submission</p>
        <span
          className={`${styles.statusBadge} ${
            intake.inviteSentAt ? styles.statusBadgeSent : styles.statusBadgePending
          }`}
        >
          {intake.inviteSentAt ? "Invite sent" : "Pending invite"}
        </span>
      </div>

      <dl className={styles.submittedSummaryList}>
        {sessionLabel ? (
          <div>
            <dt>Session</dt>
            <dd>{sessionLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt>Last updated</dt>
          <dd>{formatSubmittedAt(intake.updatedAt)}</dd>
        </div>
      </dl>

      {intake.googleMeetLink ? (
        <p className={styles.meetLinkRow}>
          <a href={intake.googleMeetLink} target="_blank" rel="noreferrer">
            Open Google Meet link
          </a>
        </p>
      ) : null}
    </section>
  );
}

export function CareerAdvisoryForm({
  defaultFirstName = "",
  defaultLastName = "",
  defaultEmail = "",
  existingIntake = null,
  initialResumeFileName = null,
  initialResumePreviewUrl = null,
}: CareerAdvisoryFormProps) {
  const router = useRouter();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CareerAdvisoryState>({});
  const [latestSubmission, setLatestSubmission] =
    useState<CandidateCareerAdvisoryIntake | null>(existingIntake);
  const [pending, startTransition] = useTransition();
  const [resumePending, setResumePending] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState(initialResumeFileName ?? "");
  const [resumePreviewUrl, setResumePreviewUrl] = useState(
    initialResumePreviewUrl ?? "",
  );

  useEffect(() => {
    if (existingIntake) {
      setLatestSubmission(existingIntake);
    }
  }, [existingIntake]);

  useEffect(() => {
    setResumeFileName(initialResumeFileName ?? "");
    setResumePreviewUrl(initialResumePreviewUrl ?? "");
  }, [initialResumeFileName, initialResumePreviewUrl]);

  async function handleResumeSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumePending(true);
    setResumeError(null);

    const uploadData = new FormData();
    uploadData.append("resume", file);
    const result = await uploadProfileResumeAction(uploadData);

    if (result.error) {
      setResumeError(result.error);
    } else {
      setResumeFileName(result.fileName ?? file.name);
      if (result.resumeUrl) {
        setResumePreviewUrl(result.resumeUrl);
      }
    }

    setResumePending(false);
    event.target.value = "";
  }

  const previousSubmission = latestSubmission;
  const formDefaults = previousSubmission ?? null;
  const nameParts = formDefaults
    ? splitFullName(formDefaults.name)
    : { firstName: defaultFirstName, lastName: defaultLastName };

  const successMessage = useMemo(() => {
    if (!state.success) {
      return null;
    }

    const sessionLabel = formatSessionLabel(state.sessionScheduledAt);
    if (state.inviteEmailSent) {
      return sessionLabel
        ? `Submitted. A Google Meet invite was sent for ${sessionLabel}.`
        : "Submitted. A Google Meet invite was sent to your email.";
    }

    if (state.ackEmailSent) {
      return sessionLabel
        ? `Submitted. One of our mentors will talk to you at ${sessionLabel} — check your email for confirmation.`
        : "Submitted. One of our mentors will talk to you at your chosen time — check your email for confirmation.";
    }

    return "Submitted. Your career advisory details were saved.";
  }, [state.success, state.inviteEmailSent, state.ackEmailSent, state.sessionScheduledAt]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitCareerAdvisoryAction(state, formData);
      setState(result ?? {});
      if (result?.submittedIntake) {
        setLatestSubmission(result.submittedIntake);
      }
      if (result?.success) {
        router.refresh();
      }
    });
  }

  return (
    <>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to dashboard
      </Link>

      <header className={dashboardStyles.topBar}>
        <div>
          <p className={dashboardStyles.eyebrow}>Student portal</p>
          <h1 className={dashboardStyles.title}>Career advisory</h1>
          <p className={dashboardStyles.subtitle}>
            Submit your background details and book a session. You can update your
            submission anytime — your latest entry is shown below.
          </p>
        </div>
      </header>

      {successMessage ? (
        <p role="status" className={authStyles.successAlert}>
          {successMessage}
        </p>
      ) : null}

      {state.error && state.success ? (
        <p role="alert" className={authStyles.alert}>
          {state.error}
        </p>
      ) : null}

      {previousSubmission ? <PreviousSubmissionPanel intake={previousSubmission} /> : null}

      <div className={`${styles.formSection} ${styles.formPanel}`}>
        <h2 className={styles.formSectionTitle}>
          {previousSubmission ? "Update your details" : "Submit your details"}
        </h2>

        <form
          key={previousSubmission?.updatedAt ?? "new"}
          action={handleSubmit}
          className={authStyles.form}
        >
          <PersonNameFields
            firstName={{
              defaultValue: nameParts.firstName,
              error: state.fieldErrors?.firstName,
            }}
            lastName={{
              defaultValue: nameParts.lastName,
              error: state.fieldErrors?.lastName,
            }}
          />

          <FormField
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="Enter your email address"
            autoComplete="email"
            defaultValue={formDefaults?.email ?? defaultEmail}
            error={state.fieldErrors?.email}
          />

          <PhoneField
            defaultPhone={formDefaults?.phone}
            error={state.fieldErrors?.phone}
            placeholder="555 123 4567"
          />

          <div className={authStyles.field}>
            <label htmlFor="graduationDetails" className={authStyles.label}>
              Highest degree
            </label>
            <select
              id="graduationDetails"
              name="graduationDetails"
              defaultValue={
                HIGHEST_DEGREE_OPTIONS.includes(
                  formDefaults?.graduationDetails as (typeof HIGHEST_DEGREE_OPTIONS)[number],
                )
                  ? formDefaults?.graduationDetails
                  : ""
              }
              className={`${styles.select} ${
                state.fieldErrors?.graduationDetails ? styles.selectError : ""
              }`}
              aria-invalid={!!state.fieldErrors?.graduationDetails}
            >
              <option value="" disabled>
                Select your highest degree
              </option>
              {HIGHEST_DEGREE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {state.fieldErrors?.graduationDetails ? (
              <p className={authStyles.fieldError}>
                {state.fieldErrors.graduationDetails}
              </p>
            ) : null}
          </div>

          <FormField
            id="branch"
            name="branch"
            label="Branch"
            placeholder="e.g. Computer Science, Mechanical Engineering"
            defaultValue={formDefaults?.branch}
            error={state.fieldErrors?.branch}
          />

          <div className={authStyles.field}>
            <label htmlFor="interestedTechnology" className={authStyles.label}>
              Interested technology
            </label>
            <textarea
              id="interestedTechnology"
              name="interestedTechnology"
              defaultValue={formDefaults?.interestedTechnology}
              className={`${styles.textarea} ${
                state.fieldErrors?.interestedTechnology ? styles.textareaError : ""
              }`}
              placeholder="e.g. React, Python, Cloud, Data Engineering"
              aria-invalid={!!state.fieldErrors?.interestedTechnology}
            />
            {state.fieldErrors?.interestedTechnology ? (
              <p className={authStyles.fieldError}>
                {state.fieldErrors.interestedTechnology}
              </p>
            ) : null}
          </div>

          <div className={styles.uploadZone}>
            <p className={styles.uploadTitle}>Resume</p>
            <p className={styles.uploadHint}>
              PDF or Word, up to 5 MB. Saved to your profile for mentors.
            </p>
            {resumeFileName ? (
              <p className={styles.uploadMeta}>
                Current file: <strong>{resumeFileName}</strong>
                {resumePreviewUrl ? (
                  <>
                    {" · "}
                    <a
                      href={resumePreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.uploadLink}
                    >
                      View
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <p className={styles.uploadMeta}>No resume uploaded yet.</p>
            )}
            <div className={styles.uploadActions}>
              <input
                ref={resumeInputRef}
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className={styles.hiddenInput}
                onChange={handleResumeSelect}
                disabled={resumePending}
              />
              <button
                type="button"
                className={styles.chooseFileBtn}
                onClick={() => resumeInputRef.current?.click()}
                disabled={resumePending}
              >
                {resumeFileName ? "Replace resume" : "Upload resume"}
              </button>
              {resumePending ? (
                <span className={styles.uploadingLabel}>Uploading…</span>
              ) : null}
            </div>
            {resumeError ? (
              <p className={authStyles.fieldError}>{resumeError}</p>
            ) : null}
          </div>

          <SessionBookingPicker
            defaultValue={sessionDefaultValue(formDefaults?.sessionScheduledAt)}
            error={state.fieldErrors?.sessionScheduledAt}
          />

          {state.error && !state.success ? (
            <p role="alert" className={authStyles.alert}>
              {state.error}
            </p>
          ) : null}

          <SubmitButton pending={pending} pendingLabel="Submitting request…">
            Submit request
          </SubmitButton>
        </form>
      </div>

      <p className={authStyles.footer}>
        <Link href="/dashboard/calendar" className={authStyles.footerLink}>
          View session calendar
        </Link>
      </p>
    </>
  );
}
