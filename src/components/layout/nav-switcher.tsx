"use client";

import { usePathname } from "next/navigation";
import { AppNavbar } from "@/components/navbar/app-navbar";
import { PortalLogoutBar } from "@/components/layout/portal-logout-bar";
import { getMarketingHomePath } from "@/lib/auth/home-path";
import type { SessionUser } from "@/lib/auth/session";
import type { AdminUser } from "@/lib/auth/admin";

type NavSwitcherProps = {
  user: SessionUser | null;
  adminUser: AdminUser | null;
};

function usesPortalTopBar(
  pathname: string,
  user: SessionUser | null,
  adminUser: AdminUser | null,
): boolean {
  if (!user) {
    return false;
  }

  const isAdminLogin = pathname.startsWith("/admin/login");
  const isAdminRoute = pathname.startsWith("/admin") && !isAdminLogin;

  if (isAdminRoute) {
    return true;
  }

  if (pathname.startsWith("/dashboard")) {
    return true;
  }

  return !adminUser;
}

export function NavSwitcher({ user, adminUser }: NavSwitcherProps) {
  const pathname = usePathname();

  if (usesPortalTopBar(pathname, user, adminUser) && user) {
    return <PortalLogoutBar user={user} />;
  }

  const homeHref = getMarketingHomePath({
    isLoggedIn: Boolean(user),
    role: adminUser?.role,
  });

  return <AppNavbar user={user} homeHref={homeHref} />;
}

export { usesPortalTopBar };
