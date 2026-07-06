"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import styles from "./site-footer.module.css";

type SiteFooterProps = {
  user?: SessionUser | null;
};

export function SiteFooter({ user = null }: SiteFooterProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return null;
  }

  const homeHref = user ? "/dashboard" : "/";

  return (
    <footer className={styles.footer}>
      <Link href={homeHref} className={styles.footerLogo}>
        jobilly<span className={styles.footerLogoWhite}>.ai</span>
      </Link>
      <div className={styles.footerLinks}>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <Link href="/contact">Contact</Link>
        {!user ? <Link href="/admin/login">Admin</Link> : null}
      </div>
      <div className={styles.footerCopy}>
        &#xA9; 2026 Jobilly.ai &#x2014; Built for graduates.
      </div>
    </footer>
  );
}
