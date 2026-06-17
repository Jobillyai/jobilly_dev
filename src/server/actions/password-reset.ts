"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";

const emailSchema = z.string().email("Enter a valid email");

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const RESET_SENT_COOKIE = "jb_reset_link_sent";
const RESET_FLOW_COOKIE = "jb_reset_flow";
const COOLDOWN_SECONDS = 60;

const SUCCESS_MESSAGE =
  "Reset link sent successfully. Check your inbox and spam folder, then open the email to set a new password.";

export type ForgotPasswordState = {
  error?: string;
  success?: string;
  sent?: boolean;
  retryAfterSeconds?: number;
  fieldErrors?: Partial<Record<"email", string>>;
};

function successState(message = SUCCESS_MESSAGE): ForgotPasswordState {
  return {
    success: message,
    sent: true,
  };
}

async function resolveAccountEmail(input: string): Promise<string | null> {
  const normalized = input.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: profiles } = await admin.from("users").select("email");

  if (profiles) {
    const profileMatch = profiles.find(
      (row) => row.email.toLowerCase() === normalized,
    );
    if (profileMatch?.email) {
      return profileMatch.email;
    }
  }

  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error || !data.users.length) {
      break;
    }

    const authMatch = data.users.find(
      (user) => user.email?.toLowerCase() === normalized,
    );

    if (authMatch?.email) {
      return authMatch.email;
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}

async function createRecoveryLink(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("generateLink error:", error);
    return null;
  }

  return data.properties?.action_link ?? null;
}

export async function sendPasswordResetLinkAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return { fieldErrors: { email: "Enter a valid email" } };
  }

  const inputEmail = parsed.data.trim();
  const cookieStore = await cookies();
  const sentCookie = cookieStore.get(RESET_SENT_COOKIE)?.value;

  if (sentCookie) {
    const [cookieEmail, sentAtRaw] = sentCookie.split(":");
    const sentAtMs = Number(sentAtRaw);
    const waitSeconds = Number.isFinite(sentAtMs)
      ? Math.ceil(
          (COOLDOWN_SECONDS * 1000 - (Date.now() - sentAtMs)) / 1000,
        )
      : 0;

    if (
      cookieEmail &&
      cookieEmail.toLowerCase() === inputEmail.toLowerCase() &&
      waitSeconds > 0
    ) {
      return {
        ...successState(),
        retryAfterSeconds: waitSeconds,
      };
    }
  }

  const authEmail = await resolveAccountEmail(inputEmail);

  if (!authEmail) {
    return {
      error:
        "No account found with this email. Please sign up first, then try again.",
    };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback`;

  const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
    redirectTo,
  });

  if (error) {
    console.error("resetPasswordForEmail error:", error);

    if (/rate limit/i.test(error.message)) {
      if (process.env.NODE_ENV === "development") {
        const actionLink = await createRecoveryLink(authEmail);

        if (actionLink) {
          console.log(`[dev] Password reset link for ${authEmail}: ${actionLink}`);

          cookieStore.set(RESET_FLOW_COOKIE, "1", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: 600,
          });

          return successState(
            "Email rate limit reached. A reset link was logged in the dev server terminal — open that link in your browser to continue.",
          );
        }
      }

      return {
        error:
          "Too many reset emails were requested. Wait a few minutes, check your inbox for an earlier email, then try again.",
        retryAfterSeconds: COOLDOWN_SECONDS,
      };
    }

    return { error: error.message };
  }

  cookieStore.set(
    RESET_SENT_COOKIE,
    `${authEmail.toLowerCase()}:${Date.now()}`,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOLDOWN_SECONDS,
    },
  );

  cookieStore.set(RESET_FLOW_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return successState();
}

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: Partial<Record<"password" | "confirmPassword", string>>;
};

export async function updatePasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<ResetPasswordState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "password" || key === "confirmPassword") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    redirect("/forgot-password");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}
