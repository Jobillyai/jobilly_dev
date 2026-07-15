"use client";

import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth";
import { adminLogoutAction } from "@/server/actions/admin-auth";
import { LogoutForm, LogoutSubmitButton } from "@/components/auth/logout-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import styles from "./portal-logout-bar.module.css";

export function PortalLogoutBar() {
  const pathname = usePathname();
  const isAdminRoute =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  return (
    <div className={styles.bar}>
      <ThemeToggle compact />
      <LogoutForm action={isAdminRoute ? adminLogoutAction : logoutAction}>
        <LogoutSubmitButton className={styles.logoutBtn}>Log out</LogoutSubmitButton>
      </LogoutForm>
    </div>
  );
}
