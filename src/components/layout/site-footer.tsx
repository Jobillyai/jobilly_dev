"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (isAdminRoute || isDashboardRoute) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <JobillyLogo href="/" height={32} className={styles.footerLogo} onDark />
      <div className={styles.footerLinks}>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <Link href="/contact">Contact</Link>
        {!isAdminRoute && <Link href="/admin/login">Admin</Link>}
      </div>
      <div className={styles.footerCopy}>
        &#xA9; 2026 Jobilly.ai &#x2014; Built for graduates.
      </div>
    </footer>
  );
}
