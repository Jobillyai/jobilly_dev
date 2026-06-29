"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  enforcePasswordResetRateLimits,
  enforceUpdatePasswordRateLimits,
  rateLimitErrorMessage,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";
import { sendPasswordResetEmail } from "@/server/services/password-reset-email";

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

const DEV_SUCCESS_MESSAGE =
  "Reset link generated. In development without Resend, the link was logged in the server terminal — open it in your browser to continue.";

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

async function resolveAccountEmail(input: string): Promise<{
  email: string;
  name: string | null;
} | null> {
  const normalized = input.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("email, name")
    .eq("email", normalized)
    .maybeSingle();

  if (profile?.email) {
    return {
      email: profile.email,
      name: profile.name,
    };
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
      const metadataName =
        typeof authMatch.user_metadata?.name === "string"
          ? authMatch.user_metadata.name
          : null;

      return {
        email: authMatch.email,
        name: metadataName,
      };
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}

function setResetCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  authEmail: string,
) {
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

  const rateLimit = await enforcePasswordResetRateLimits(inputEmail);
  if (!rateLimit.allowed) {
    return {
      error: rateLimitErrorMessage(rateLimit.retryAfterSeconds),
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

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

  const account = await resolveAccountEmail(inputEmail);

  if (!account) {
    return {
      error:
        "No account found with this email. Please sign up first, then try again.",
    };
  }

  const sendResult = await sendPasswordResetEmail(account.email, account.name);

  if (!sendResult.sent) {
    return { error: sendResult.error };
  }

  setResetCookies(cookieStore, account.email);

  if (sendResult.devMode) {
    return successState(DEV_SUCCESS_MESSAGE);
  }

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

  const rateLimit = await enforceUpdatePasswordRateLimits();
  if (!rateLimit.allowed) {
    return { error: rateLimitErrorMessage(rateLimit.retryAfterSeconds) };
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
