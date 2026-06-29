"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  sendPasswordResetLinkAction,
  type ForgotPasswordState,
} from "@/server/actions/password-reset";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import styles from "@/components/auth/auth-page.module.css";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, setState] = useState<ForgotPasswordState>(initialState);
  const [pending, startTransition] = useTransition();
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!state.retryAfterSeconds || state.retryAfterSeconds <= 0) {
      setRetryAfterSeconds(null);
      return;
    }

    setRetryAfterSeconds(state.retryAfterSeconds);
    const timer = window.setInterval(() => {
      setRetryAfterSeconds((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(timer);
          return null;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.retryAfterSeconds]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await sendPasswordResetLinkAction(state, formData);
      setState(result ?? {});
    });
  }

  const cooldownActive = retryAfterSeconds !== null && retryAfterSeconds > 0;

  return (
    <>
      <Link href="/login" className={styles.backLink}>
        ← Back to login
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>
          Reset your <em className={styles.titleEm}>password</em>
        </h1>
        <p className={styles.subtitle}>
          Enter your account email and we&apos;ll send a link to choose a new password.
        </p>
      </div>

      <form action={handleSubmit} className={styles.form}>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="Enter your email address"
          autoComplete="email"
          error={state.fieldErrors?.email}
        />

        {state.success ? (
          <p role="status" className={styles.successAlert}>
            {state.success}
          </p>
        ) : null}

        {state.error ? (
          <p role="alert" className={styles.alert}>
            {state.error}
            {cooldownActive ? ` Try again in ${retryAfterSeconds}s.` : null}
          </p>
        ) : null}

        <SubmitButton
          pending={pending}
          pendingLabel="Sending link…"
          disabled={cooldownActive}
        >
          {cooldownActive ? `Wait ${retryAfterSeconds}s` : "Send reset link"}
        </SubmitButton>
      </form>

      <p className={styles.footer}>
        Remember your password?{" "}
        <Link href="/login" className={styles.footerLink}>
          Log in
        </Link>
      </p>
    </>
  );
}
