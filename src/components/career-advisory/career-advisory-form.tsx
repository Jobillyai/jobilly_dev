"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  submitCareerAdvisoryAction,
  type CareerAdvisoryState,
} from "@/server/actions/career-advisory";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import authStyles from "@/components/auth/auth-page.module.css";
import styles from "./career-advisory-form.module.css";

type CareerAdvisoryFormProps = {
  defaultName?: string;
  defaultEmail?: string;
};

const initialState: CareerAdvisoryState = {};

export function CareerAdvisoryForm({
  defaultName = "",
  defaultEmail = "",
}: CareerAdvisoryFormProps) {
  const [state, setState] = useState<CareerAdvisoryState>(initialState);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitCareerAdvisoryAction(state, formData);
      setState(result ?? {});
    });
  }

  if (state.success) {
    const scheduledLabel = state.sessionScheduledAt
      ? new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(new Date(state.sessionScheduledAt))
      : null;

    return (
      <>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to dashboard
        </Link>

        <div className={authStyles.header}>
          <h1 className={authStyles.title}>
            Request <em className={authStyles.titleEm}>submitted</em>
          </h1>
          <p className={authStyles.subtitle}>
            {state.inviteEmailSent
              ? "Check your email for your Google Meet calendar invite and session details."
              : state.error
                ? "Your details were saved. We could not send the Google Meet invite email yet."
                : "Thanks for sharing your details. Our career advisory team will review your information."}
          </p>
        </div>

        <p role="status" className={authStyles.successAlert}>
          {state.inviteEmailSent
            ? `A Google Meet invite was sent to your email${scheduledLabel ? ` for ${scheduledLabel}` : ""}.`
            : "Your career advisory request was submitted successfully."}
        </p>

        {state.error && (
          <p role="alert" className={authStyles.alert}>
            {state.error}
          </p>
        )}

        <p className={authStyles.footer}>
          <Link href="/dashboard" className={authStyles.footerLink}>
            Return to dashboard
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={styles.backLink}>
        ← Back to dashboard
      </Link>

      <div className={authStyles.header}>
        <h1 className={authStyles.title}>
          Career <em className={authStyles.titleEm}>Advisory</em>
        </h1>
        <p className={authStyles.subtitle}>
          Tell us about your background so we can map the right skills and
          technologies for your first job.
        </p>
      </div>

      <form action={handleSubmit} className={authStyles.form}>
        <FormField
          id="name"
          name="name"
          label="Name"
          placeholder="Your full name"
          autoComplete="name"
          defaultValue={defaultName}
          error={state.fieldErrors?.name}
        />

        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="Enter your email address"
          autoComplete="email"
          defaultValue={defaultEmail}
          error={state.fieldErrors?.email}
        />

        <FormField
          id="phone"
          name="phone"
          type="tel"
          label="Phone number"
          placeholder="e.g. +1 555 123 4567"
          autoComplete="tel"
          error={state.fieldErrors?.phone}
        />

        <FormField
          id="graduationDetails"
          name="graduationDetails"
          label="Graduation details"
          placeholder="e.g. B.Tech Computer Science, 2024"
          error={state.fieldErrors?.graduationDetails}
        />

        <FormField
          id="branch"
          name="branch"
          label="Branch"
          placeholder="e.g. Computer Science, Mechanical Engineering"
          error={state.fieldErrors?.branch}
        />

        <div className={authStyles.field}>
          <label htmlFor="isVeteran" className={authStyles.label}>
            Veteran
          </label>
          <select
            id="isVeteran"
            name="isVeteran"
            className={`${styles.select} ${
              state.fieldErrors?.isVeteran ? styles.selectError : ""
            }`}
            aria-invalid={!!state.fieldErrors?.isVeteran}
            defaultValue=""
          >
            <option value="" disabled>
              Select an option
            </option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
          {state.fieldErrors?.isVeteran && (
            <p className={authStyles.fieldError}>{state.fieldErrors.isVeteran}</p>
          )}
        </div>

        <div className={authStyles.field}>
          <label htmlFor="interestedTechnology" className={authStyles.label}>
            Interested technology
          </label>
          <textarea
            id="interestedTechnology"
            name="interestedTechnology"
            className={`${styles.textarea} ${
              state.fieldErrors?.interestedTechnology ? styles.textareaError : ""
            }`}
            placeholder="e.g. React, Python, Cloud, Data Engineering"
            aria-invalid={!!state.fieldErrors?.interestedTechnology}
          />
          {state.fieldErrors?.interestedTechnology && (
            <p className={authStyles.fieldError}>
              {state.fieldErrors.interestedTechnology}
            </p>
          )}
        </div>

        {state.error && (
          <p role="alert" className={authStyles.alert}>
            {state.error}
          </p>
        )}

        <SubmitButton pending={pending} pendingLabel="Submitting…">
          Submit
        </SubmitButton>
      </form>
    </>
  );
}
