"use client";

import { usePathname } from "next/navigation";
import { FastLogoutButton } from "@/components/auth/fast-logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import styles from "./portal-logout-bar.module.css";

export function PortalLogoutBar() {
  const pathname = usePathname();
  const isAdminRoute =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isPortalRoute = pathname.startsWith("/dashboard") || isAdminRoute;
  const logoutRedirect = isAdminRoute ? "/admin/login" : "/login";

  if (isPortalRoute) {
    return null;
  }

  return (
    <div className={styles.bar}>
      <ThemeToggle compact />
      <FastLogoutButton className={styles.logoutBtn} redirectTo={logoutRedirect}>
        Log out
      </FastLogoutButton>
    </div>
  );
}
