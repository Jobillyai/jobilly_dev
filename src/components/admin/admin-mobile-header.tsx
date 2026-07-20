"use client";

import Link from "next/link";
import { Loader2, LogOut } from "lucide-react";
import { FastLogoutButton } from "@/components/auth/fast-logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import styles from "./admin-mobile-header.module.css";

export function AdminMobileHeader() {
  return (
    <header className={styles.header}>
      <Link href="/admin" className={styles.brand} aria-label="Jobilly.ai admin home">
        {/* eslint-disable-next-line @next/next/no-img-element -- local brand PNG lockup */}
        <img
          src="/brand/jobilly-logo-arrow-name.png"
          alt="Jobilly"
          className={styles.brandLockup}
          draggable={false}
        />
      </Link>
      <div className={styles.actions}>
        <ThemeToggle compact />
        <FastLogoutButton
          className={styles.iconBtn}
          redirectTo="/admin/login"
          aria-label="Log out"
          pendingLabel={<Loader2 size={18} strokeWidth={2} className={styles.spin} aria-hidden />}
        >
          <LogOut size={18} strokeWidth={2} aria-hidden />
        </FastLogoutButton>
      </div>
    </header>
  );
}
