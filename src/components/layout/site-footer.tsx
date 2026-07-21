"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import { isAuthRoute } from "@/components/layout/nav-switcher";
import type { SessionUser } from "@/lib/auth/session";
import styles from "./site-footer.module.css";

const LINKEDIN_COMPANY_URL =
  "https://www.linkedin.com/company/jobilly-ai-infotech-and-it-services-private-limited/";

function LinkedInIcon() {
  return (
    <svg
      className={styles.socialIcon}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}

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
      <div className={styles.top}>
        <JobillyLogo href="/" onDark className={styles.footerLogo} />
        <nav className={styles.nav} aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <a
          href={LINKEDIN_COMPANY_URL}
          className={styles.linkedinLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Jobilly on LinkedIn"
        >
          <LinkedInIcon />
        </a>
      </div>

      <div className={styles.bottom}>
        <p className={styles.footerCopy}>
          &#xA9; 2026 Jobilly.ai &#x2014; Built for graduates.
        </p>
        <div className={styles.meta}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/admin/login">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
