"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  submitCareerAdvisoryAction,
  type CareerAdvisoryState,
} from "@/server/actions/career-advisory";
import type { CandidateCareerAdvisoryIntake } from "@/server/services/career-advisory-intake";
import { formatDateTimeLocalValue } from "@/lib/career-advisory/booking-window";
import { PersonNameFields } from "@/components/auth/person-name-fields";
import { PhoneField } from "@/components/auth/phone-field";
import { FormField } from "@/components/auth/form-field";
import { splitFullName } from "@/lib/format-person-name";
import { SubmitButton } from "@/components/auth/submit-button";
import { SessionBookingPicker } from "@/components/career-advisory/session-booking-picker";
import authStyles from "@/components/auth/auth-page.module.css";
import dashboardStyles from "@/app/dashboard/dashboard.module.css";
import styles from "./career-advisory-form.module.css";

type CareerAdvisoryFormProps = {
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultEmail?: string;
  existingIntake?: CandidateCareerAdvisoryIntake | null;
};

function formatSessionLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
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

  return formatDateTimeLocalValue(date);
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
}: CareerAdvisoryFormProps) {
  const router = useRouter();
  const [state, setState] = useState<CareerAdvisoryState>({});
  const [latestSubmission, setLatestSubmission] =
    useState<CandidateCareerAdvisoryIntake | null>(existingIntake);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (existingIntake) {
      setLatestSubmission(existingIntake);
    }
  }, [existingIntake]);

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

    return "Submitted. Your career advisory details were saved.";
  }, [state.success, state.inviteEmailSent, state.sessionScheduledAt]);

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
        <p className={dashboardStyles.dateLabel}>
          {new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(new Date())}
        </p>
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

          <FormField
            id="graduationDetails"
            name="graduationDetails"
            label="Graduation details"
            placeholder="e.g. B.Tech Computer Science, 2024"
            defaultValue={formDefaults?.graduationDetails}
            error={state.fieldErrors?.graduationDetails}
          />

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
