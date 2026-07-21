"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { combineFirstLastName } from "@/lib/format-person-name";
import { isAdminPortalRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";

const detailsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(80),
  lastName: z.string().trim().min(1, "Enter your last name").max(80),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((value) => value ?? ""),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type StaffProfileState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"firstName" | "lastName" | "phone", string>>;
};

export type StaffPasswordState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<"password" | "confirmPassword", string>>;
  clearedForcePassword?: boolean;
};

async function requireStaffUser() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.email) {
    return { error: "You must be logged in." } as const;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!isAdminPortalRole(profile?.role)) {
    return { error: "This account does not have staff portal access." } as const;
  }

  return { supabase, admin, user: authData.user } as const;
}

export async function updateStaffProfileAction(
  _prevState: StaffProfileState,
  formData: FormData,
): Promise<StaffProfileState> {
  const parsed = detailsSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone")?.toString() ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<StaffProfileState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "firstName" || key === "lastName" || key === "phone") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const access = await requireStaffUser();
  if ("error" in access) {
    return { error: access.error };
  }

  const { firstName, lastName, phone } = parsed.data;
  const name = combineFirstLastName(firstName, lastName);
  const phoneValue = phone.trim() || null;

  const { error: dbError } = await access.admin
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      name,
      phone: phoneValue,
    })
    .eq("id", access.user.id);

  if (dbError) {
    return { error: "Could not save your profile. Try again." };
  }

  const { error: metaError } = await access.supabase.auth.updateUser({
    data: {
      name,
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (metaError) {
    return { error: "Profile saved, but session name could not be refreshed." };
  }

  revalidatePath("/admin/profile");
  return { success: "Profile details saved." };
}

export async function updateStaffPasswordAction(
  _prevState: StaffPasswordState,
  formData: FormData,
): Promise<StaffPasswordState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<StaffPasswordState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "password" || key === "confirmPassword") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const access = await requireStaffUser();
  if ("error" in access) {
    return { error: access.error };
  }

  const { error: passwordError } = await access.supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (passwordError) {
    return { error: passwordError.message || "Could not update password." };
  }

  const hadForceFlag =
    access.user.app_metadata?.must_change_password === true;

  if (hadForceFlag) {
    const { error: metaError } = await access.admin.auth.admin.updateUserById(
      access.user.id,
      {
        app_metadata: {
          ...access.user.app_metadata,
          must_change_password: false,
        },
      },
    );

    if (metaError) {
      return {
        error:
          "Password updated, but we could not clear the first-login flag. Sign out and back in, or contact support.",
      };
    }

    await access.supabase.auth.refreshSession();
  }

  revalidatePath("/admin/profile");
  revalidatePath("/admin");

  return {
    success: hadForceFlag
      ? "Password updated. You can use the full admin portal now."
      : "Password updated.",
    clearedForcePassword: hadForceFlag,
  };
}
