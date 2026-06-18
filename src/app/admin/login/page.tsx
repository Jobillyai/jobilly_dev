"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  adminLoginAction,
  type AdminLoginState,
} from "@/server/actions/admin-auth";
import { FormField } from "@/components/auth/form-field";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";
import styles from "@/components/auth/auth-page.module.css";

const initialState: AdminLoginState = {};

export default function AdminLoginPage() {
  const [state, setState] = useState<AdminLoginState>(initialState);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await adminLoginAction(state, formData);
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
      <Link href="/" className={styles.backLink}>
        ← Go back
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>
          Admin <em className={styles.titleEm}>login</em>
        </h1>
        <p className={styles.subtitle}>
          Sign in with your admin account to manage students and submissions.
        </p>
      </div>

      <form action={handleSubmit} className={styles.form}>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="Enter your admin email"
          autoComplete="email"
          error={state?.fieldErrors?.email}
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={state?.fieldErrors?.password}
        />

        {state?.error && (
          <p role="alert" className={styles.alert}>
            {state.error}
          </p>
        )}

        <SubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </SubmitButton>
      </form>
    </>
  );
}
