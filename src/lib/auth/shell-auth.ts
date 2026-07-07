import { cache } from "react";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { isAdminPortalRole, type AdminPortalRole } from "@/lib/auth/roles";
import type { AdminUser } from "@/lib/auth/admin";

export const getShellAuth = cache(async (): Promise<{
  user: SessionUser | null;
  adminUser: AdminUser | null;
}> => {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, adminUser: null };
  }

  if (!user.role || !isAdminPortalRole(user.role)) {
    return { user, adminUser: null };
  }

  return {
    user,
    adminUser: { ...user, role: user.role as AdminPortalRole },
  };
});
