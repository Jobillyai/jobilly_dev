"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/server/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, setState] = useState<LoginState>(initialState);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await loginAction(state, formData);
        setState(result ?? {});
      } catch (err) {
        // Next.js's redirect() throws a special NEXT_REDIRECT error to
        // trigger navigation — rethrow it so the framework can handle it.
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Log in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Pick up where you left off.
        </p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          error={state?.fieldErrors?.email}
        />
        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          error={state?.fieldErrors?.password}
        />

        {state?.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <SubmitButton pending={pending} pendingLabel="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&#x2019;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
