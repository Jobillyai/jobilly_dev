"use client";

import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth";
import { adminLogoutAction } from "@/server/actions/admin-auth";
import { LogoutForm, LogoutSubmitButton } from "@/components/auth/logout-form";
import { formatDisplayName } from "@/lib/format-display-name";
import type { SessionUser } from "@/lib/auth/session";
import styles from "./portal-logout-bar.module.css";

type PortalLogoutBarProps = {
  user: SessionUser;
};

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return `${parts[0][0]}${parts[parts.length - 1]![0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function PortalLogoutBar({ user }: PortalLogoutBarProps) {
  const pathname = usePathname();
  const isAdminRoute =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  const displayName = user.name
    ? formatDisplayName(user.name)
    : formatDisplayName(user.email.split("@")[0] ?? user.email);

  return (
    <div className={styles.bar}>
      <div className={styles.userBlock}>
        <div className={styles.userAvatar}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className={styles.userAvatarImage} />
          ) : (
            getInitials(user.name, user.email)
          )}
        </div>
        <div className={styles.userMeta}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userEmail}>{user.email}</span>
        </div>
      </div>

      <LogoutForm action={isAdminRoute ? adminLogoutAction : logoutAction}>
        <LogoutSubmitButton className={styles.logoutBtn}>Log out</LogoutSubmitButton>
      </LogoutForm>
    </div>
  );
}
