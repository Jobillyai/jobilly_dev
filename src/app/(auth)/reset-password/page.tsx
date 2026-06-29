"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updatePasswordAction,
  type ResetPasswordState,
} from "@/server/actions/password-reset";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";
import styles from "@/components/auth/auth-page.module.css";

const initialState: ResetPasswordState = {};

export default function ResetPasswordPage() {
  const [state, setState] = useState<ResetPasswordState>(initialState);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await updatePasswordAction(state, formData);
        setState(result ?? {});
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof err.digest === "string" &&
          err.digest.startsWith("NEXT_REDIRECT")
        ) {
          throw err;
        }
        setState({ error: "Something went wrong. Please try again." });
      }
    });
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Choose a new <em className={styles.titleEm}>password</em>
        </h1>
        <p className={styles.subtitle}>
          Use at least 8 characters. You&apos;ll log in again after saving.
        </p>
      </div>

      <form action={handleSubmit} className={styles.form}>
        <PasswordField
          id="password"
          name="password"
          label="New password"
          placeholder="Enter a new password"
          autoComplete="new-password"
          error={state.fieldErrors?.password}
        />

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword}
        />

        {state.error ? (
          <p role="alert" className={styles.alert}>
            {state.error}
          </p>
        ) : null}

        <SubmitButton pending={pending} pendingLabel="Saving…">
          Update password
        </SubmitButton>
      </form>

      <p className={styles.footer}>
        Link expired?{" "}
        <Link href="/forgot-password" className={styles.footerLink}>
          Request a new reset link
        </Link>
      </p>
    </>
  );
}
