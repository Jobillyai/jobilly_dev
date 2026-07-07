import { cache } from "react";
import { createClient } from "@/server/db/supabase-server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import {
  canScrapeJobs,
  isAdminPortalRole,
  isManagerRole,
  type AdminPortalRole,
} from "@/lib/auth/roles";

export type AdminUser = SessionUser & {
  role: AdminPortalRole;
};

export type StaffContext = {
  userId: string;
  role: AdminPortalRole;
};

export const getUserRole = cache(async (userId: string): Promise<string | null> => {
  const user = await getSessionUser();
  if (user?.id === userId && user.role) {
    return user.role;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role ?? null;
});

export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const user = await getSessionUser();
  if (!user?.role || !isAdminPortalRole(user.role)) {
    return null;
  }

  return {
    ...user,
    role: user.role as AdminPortalRole,
  };
});

export function toStaffContext(admin: AdminUser): StaffContext {
  return { userId: admin.id, role: admin.role };
}

export function staffCanScrapeJobs(staff: StaffContext): boolean {
  return canScrapeJobs(staff.role);
}

/** Managers oversee the team but do not use the job apply portal. */
export function staffCanAccessJobApplyPortal(staff: StaffContext): boolean {
  return !isManagerRole(staff.role);
}

export function staffIsManager(staff: StaffContext): boolean {
  return isManagerRole(staff.role);
}
