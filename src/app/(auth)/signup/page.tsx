"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signupAction, type SignupState } from "@/server/actions/auth";
import { PersonNameFields } from "@/components/auth/person-name-fields";
import { FormField } from "@/components/auth/form-field";
import { PasswordField } from "@/components/auth/password-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { AuthDivider, GoogleAuthButton } from "@/components/auth/google-auth-button";
import styles from "@/components/auth/auth-page.module.css";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, setState] = useState<SignupState>(initialState);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await signupAction(state, formData);
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
          Create your <em className={styles.titleEm}>account</em>
        </h1>
        <p className={styles.subtitle}>
          Start your path from graduation to your first job — guided by AI.
        </p>
      </div>

      <GoogleAuthButton label="Sign up with Google" />
      <AuthDivider />

      <form action={handleSubmit} className={styles.form}>
        <PersonNameFields
          firstName={{ error: state?.fieldErrors?.firstName }}
          lastName={{ error: state?.fieldErrors?.lastName }}
        />
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="Enter your email address"
          autoComplete="email"
          error={state?.fieldErrors?.email}
        />
        <PasswordField
          id="password"
          name="password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={state?.fieldErrors?.password}
        />

        {state?.error && (
          <p role="alert" className={styles.alert}>
            {state.error}
          </p>
        )}

        <SubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>

      <p className={styles.footer}>
        Already have an account?{" "}
        <Link href="/login" className={styles.footerLink}>
          Log in
        </Link>
      </p>
    </>
  );
}
