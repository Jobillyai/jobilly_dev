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

export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role ?? null;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("role, member_id")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminPortalRole(profile.role)) {
    return null;
  }

  return {
    ...user,
    role: profile.role as AdminPortalRole,
    memberId: profile.member_id ?? user.memberId ?? null,
  };
}

export function toStaffContext(admin: AdminUser): StaffContext {
  return { userId: admin.id, role: admin.role };
}

export function staffCanScrapeJobs(staff: StaffContext): boolean {
  return canScrapeJobs(staff.role);
}

export function staffIsManager(staff: StaffContext): boolean {
  return isManagerRole(staff.role);
}
