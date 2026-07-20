"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminUser } from "@/lib/auth/admin";
import { UserMenu } from "@/components/navbar/user-menu";
import styles from "@/components/navbar/navbar.module.css";

type AdminNavbarProps = {
  user?: AdminUser | null;
};

export function AdminNavbar({ user }: AdminNavbarProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return (
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo}>
          <span className={styles.navLogoText}>
            jobilly<span className={styles.navLogoTextDark}>.ai</span>
          </span>
        </Link>
      </nav>
    );
  }

  return (
    <nav className={styles.nav}>
      <Link href="/admin" className={styles.navLogo}>
        <span className={styles.navLogoText}>
          jobilly<span className={styles.navLogoTextDark}>.ai</span>
        </span>
      </Link>

      <div className={styles.navRight}>
        {user ? (
          <div className={styles.navActions}>
            <UserMenu
              user={user}
              profileHref="/admin/profile"
              logoutRedirect="/admin/login"
              showLogout={false}
            />
          </div>
        ) : null}
      </div>
    </nav>
  );
}
