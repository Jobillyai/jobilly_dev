"use client";

import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { UserMenu } from "@/components/navbar/user-menu";
import styles from "@/components/navbar/navbar.module.css";

type CandidateNavbarProps = {
  user?: SessionUser | null;
};

export function CandidateNavbar({ user }: CandidateNavbarProps) {
  return (
    <nav className={styles.nav}>
      <Link href="/dashboard" className={styles.navLogo}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
          <rect width="28" height="28" rx="8" fill="#1877F2" />
          <path
            d="M8 14C8 10.686 10.686 8 14 8C17.314 8 20 10.686 20 14C20 17.314 17.314 20 14 20"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="14" cy="14" r="2.5" fill="white" />
          <path d="M14 20V22" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className={styles.navLogoText}>
          jobilly<span className={styles.navLogoTextDark}>.ai</span>
        </span>
      </Link>

      <div className={styles.navRight}>
        {user ? (
          <div className={styles.navActions}>
            <UserMenu user={user} profileHref="/dashboard/profile" showLogout={false} />
          </div>
        ) : null}
      </div>
    </nav>
  );
}
