"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import { isAuthRoute } from "@/components/layout/nav-switcher";
import type { SessionUser } from "@/lib/auth/session";
import styles from "./site-footer.module.css";
type SiteFooterProps = {
  user?: SessionUser | null;
};

export function SiteFooter({ user = null }: SiteFooterProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (user || isAdminRoute || isAuthRoute(pathname)) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <JobillyLogo href="/" onDark className={styles.footerLogo} />
      <div className={styles.footerLinks}>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/admin/login">Admin</Link>
      </div>
      <div className={styles.footerCopy}>
        &#xA9; 2026 Jobilly.ai &#x2014; Built for graduates.
      </div>
    </footer>
  );
}
