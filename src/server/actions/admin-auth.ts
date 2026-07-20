"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TAB_SESSION_COOKIE_NAME, getTabSessionCookieOptions } from "@/lib/auth/supabase-cookies";
import { isAdminPortalRole } from "@/lib/auth/roles";
import {
  enforceLoginRateLimits,
  rateLimitErrorMessage,
} from "@/lib/rate-limit";
import { createAdminClient } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type AdminLoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

export async function adminLoginAction(
  _prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<AdminLoginState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const rateLimit = await enforceLoginRateLimits("admin", parsed.data.email);
  if (!rateLimit.allowed) {
    return { error: rateLimitErrorMessage(rateLimit.retryAfterSeconds) };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword(
    parsed.data,
  );

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const userId = authData.user?.id;
  if (!userId) {
    await supabase.auth.signOut();
    return { error: "Could not verify your account." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!isAdminPortalRole(profile?.role)) {
    await supabase.auth.signOut();
    return { error: "This account does not have admin portal access." };
  }

  (await cookies()).set(TAB_SESSION_COOKIE_NAME, "1", getTabSessionCookieOptions());
  redirect("/admin");
}

export async function adminLogoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(TAB_SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
