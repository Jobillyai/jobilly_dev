"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerLogo}>
        jobilly<span className={styles.footerLogoWhite}>.ai</span>
      </div>
      <div className={styles.footerLinks}>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Contact</a>
        {!isAdminRoute && <Link href="/admin/login">Admin</Link>}
      </div>
      <div className={styles.footerCopy}>
        &#xA9; 2026 Jobilly.ai &#x2014; Built for graduates.
      </div>
    </footer>
  );
}
