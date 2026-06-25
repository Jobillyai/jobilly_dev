"use client";

import { usePathname } from "next/navigation";
import { AppNavbar } from "@/components/navbar/app-navbar";
import { AdminNavbar } from "@/components/admin/admin-navbar";
import { CandidateNavbar } from "@/components/candidate/candidate-navbar";
import type { SessionUser } from "@/lib/auth/session";
import type { AdminUser } from "@/lib/auth/admin";

type NavSwitcherProps = {
  user: SessionUser | null;
  adminUser: AdminUser | null;
};

export function NavSwitcher({ user, adminUser }: NavSwitcherProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (isAdminRoute) {
    return <AdminNavbar user={adminUser} />;
  }

  if (isDashboardRoute) {
    return <CandidateNavbar user={user} />;
  }

  return <AppNavbar user={user} />;
}
