"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminPortalRole } from "@/lib/auth/roles";
import { combineFirstLastName } from "@/lib/format-person-name";
import {
  enforceLoginRateLimits,
  rateLimitErrorMessage,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";
import { registerNewCandidateSignup } from "@/server/services/register-new-candidate-signup";

const signupSchema = z.object({
  firstName: z.string().min(1, "Enter your first name").max(100),
  lastName: z.string().min(1, "Enter your last name").max(100),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

function formatAuthError(message: string): string {
  if (/rate limit/i.test(message)) {
    return "Too many emails were sent from this project. Wait a few minutes, then try again.";
  }

  return message;
}

function shouldAutoConfirmSignup(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTO_CONFIRM_SIGNUP === "true"
  );
}

function buildUserMetadata(firstName: string, lastName: string) {
  const fullName = combineFirstLastName(firstName, lastName);
  return {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    name: fullName,
  };
}

export type SignupState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"firstName" | "lastName" | "email" | "password", string>
  >;
};

export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<SignupState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "firstName" ||
        key === "lastName" ||
        key === "email" ||
        key === "password"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const { firstName, lastName, email, password } = parsed.data;
  const userMetadata = buildUserMetadata(firstName, lastName);

  if (shouldAutoConfirmSignup()) {
    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError) {
      return { error: formatAuthError(createError.message) };
    }

    if (created.user?.id) {
      await registerNewCandidateSignup({
        userId: created.user.id,
        email,
        firstName,
        lastName,
      });
    }

    redirect("/login?signup=success");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userMetadata,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: formatAuthError(error.message) };
  }

  if (data.user?.id) {
    await registerNewCandidateSignup({
      userId: data.user.id,
      email,
      firstName,
      lastName,
    });
  }

  redirect("/login?signup=success");
}

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<LoginState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const rateLimit = await enforceLoginRateLimits("candidate", parsed.data.email);
  if (!rateLimit.allowed) {
    return { error: rateLimitErrorMessage(rateLimit.retryAfterSeconds) };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const userId = authData.user?.id;
  if (userId) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (isAdminPortalRole(profile?.role)) {
      redirect("/admin");
    }
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithGoogleAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return { error: formatAuthError(error.message) };
  }

  if (!data.url) {
    return { error: "Could not start Google sign-in. Try again." };
  }

  redirect(data.url);
}
