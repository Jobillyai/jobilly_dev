"use client";

import { usePathname } from "next/navigation";
import { AppNavbar } from "@/components/navbar/app-navbar";
import type { SessionUser } from "@/lib/auth/session";
import type { AdminUser } from "@/lib/auth/admin";

type NavSwitcherProps = {
  user: SessionUser | null;
  adminUser: AdminUser | null;
};

export function NavSwitcher({ user, adminUser }: NavSwitcherProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (isAdminRoute || isDashboardRoute) {
    return null;
  }

  return <AppNavbar user={user} />;
}
