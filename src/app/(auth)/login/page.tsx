"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "@/server/actions/auth";
import { lookupMemberIdByEmailAction } from "@/server/actions/member-id";
import { LoginMemberIdPreview } from "@/components/auth/login-member-id-preview";
import { FormField } from "@/components/auth/form-field";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { AuthDivider, GoogleAuthButton } from "@/components/auth/google-auth-button";
import styles from "@/components/auth/auth-page.module.css";

const initialState: LoginState = {};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const confirmationError =
    searchParams.get("error") === "confirmation_failed"
      ? "Email confirmation failed. Open the link in the same browser you signed up with, or sign up again."
      : undefined;
  const signupSuccess = searchParams.get("signup") === "success";
  const resetSuccess = searchParams.get("reset") === "success";
  const [state, setState] = useState<LoginState>(initialState);
  const [pending, startTransition] = useTransition();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberIdLoading, setMemberIdLoading] = useState(false);

  async function handleEmailBlur(event: React.FocusEvent<HTMLInputElement>) {
    const email = event.target.value.trim();
    if (!email.includes("@")) {
      setMemberId(null);
      return;
    }

    setMemberIdLoading(true);
    try {
      const result = await lookupMemberIdByEmailAction(email);
      setMemberId(result.memberId);
    } finally {
      setMemberIdLoading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await loginAction(state, formData);
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
          Welcome <em className={styles.titleEm}>back</em>
        </h1>
        <p className={styles.subtitle}>
          Pick up where you left off on your path to your first job.
        </p>
      </div>

      <GoogleAuthButton label="Sign in with Google" />
      <AuthDivider />

      <form action={handleSubmit} className={styles.form}>
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="Enter your email address"
          autoComplete="email"
          error={state?.fieldErrors?.email}
          onBlur={handleEmailBlur}
        />

        <LoginMemberIdPreview
          hintExample="JAC0001"
          memberId={memberId}
          loading={memberIdLoading}
        />

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
          <PasswordField
            id="password"
            name="password"
            label="Password"
            hideLabel
            placeholder="Enter your password"
            autoComplete="current-password"
            error={state?.fieldErrors?.password}
          />
        </div>

        {((signupSuccess || resetSuccess || state?.error) ?? confirmationError) && (
          <p
            role={signupSuccess || resetSuccess ? "status" : "alert"}
            className={
              signupSuccess || resetSuccess ? styles.successAlert : styles.alert
            }
          >
            {signupSuccess
              ? "Account created successfully. Log in with your email and password."
              : resetSuccess
                ? "Password updated. Log in with your new password."
                : (state?.error ?? confirmationError)}
          </p>
        )}

        <SubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <p className={styles.footer}>
        Don&#x2019;t have an account?{" "}
        <Link href="/signup" className={styles.footerLink}>
          Sign up
        </Link>
        {" · "}
        <Link href="/admin/login" className={styles.footerLink}>
          Admin login
        </Link>
      </p>
    </>
  );
}
