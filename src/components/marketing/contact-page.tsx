"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  submitContactFormAction,
  type ContactFormState,
} from "@/server/actions/contact";
import { PersonNameFields } from "@/components/auth/person-name-fields";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { AbstractBackground } from "@/components/layout/abstract-background";
import authStyles from "@/components/auth/auth-page.module.css";
import styles from "./contact-page.module.css";

const initialState: ContactFormState = {};

export function ContactPage() {
  const [state, setState] = useState<ContactFormState>(initialState);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitContactFormAction(state, formData);
      setState(result ?? {});
    });
  }

  return (
    <div className={styles.page}>
      <AbstractBackground className={styles.background} />
      <div className={styles.inner}>
        <div className={styles.header}>
          <Link href="/" className={authStyles.backLink}>
            ← Back to home
          </Link>
          <h1 className={styles.title}>
            Contact <em className={styles.titleEm}>us</em>
          </h1>
          <p className={styles.subtitle}>
            Tell us what you need — our manager will review your request and
            assign the right mentor admin to help you.
          </p>
        </div>

        <form action={handleSubmit} className={`${authStyles.form} ${styles.form}`}>
          <PersonNameFields
            firstName={{ error: state.fieldErrors?.firstName }}
            lastName={{ error: state.fieldErrors?.lastName }}
          />

          <FormField
            id="email"
            name="email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            autoComplete="email"
            error={state.fieldErrors?.email}
          />

          <FormField
            id="phone"
            name="phone"
            type="tel"
            label="US phone number"
            placeholder="+1 555 123 4567"
            autoComplete="tel"
            error={state.fieldErrors?.phone}
          />

          <div className={authStyles.field}>
            <label htmlFor="enquiry" className={authStyles.label}>
              Your enquiry
            </label>
            <textarea
              id="enquiry"
              name="enquiry"
              rows={6}
              className={`${authStyles.input} ${styles.textarea} ${
                state.fieldErrors?.enquiry ? authStyles.inputError : ""
              }`}
              placeholder="How can Jobilly help you?"
              aria-invalid={Boolean(state.fieldErrors?.enquiry)}
            />
            {state.fieldErrors?.enquiry ? (
              <p className={authStyles.fieldError}>{state.fieldErrors.enquiry}</p>
            ) : null}
          </div>

          {state.success ? (
            <p role="status" className={authStyles.successAlert}>
              {state.success}
            </p>
          ) : null}

          {state.error ? (
            <p role="alert" className={authStyles.alert}>
              {state.error}
            </p>
          ) : null}

          <SubmitButton pending={pending} pendingLabel="Submitting…">
            Submit request
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
