"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  CANDIDATE_NAV_ITEMS,
  isCandidateNavActive,
} from "@/components/candidate/candidate-nav";
import styles from "./candidate-sidebar.module.css";

type CandidateSidebarProps = {
  unreadApplications?: number;
};

export function CandidateSidebar({ unreadApplications = 0 }: CandidateSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className={styles.mobileToggle}
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {mobileOpen ? (
        <div
          className={styles.backdrop}
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}
      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
      >
      <Link href="/dashboard" className={styles.brand} aria-label="Jobilly.ai home">
        {/* eslint-disable-next-line @next/next/no-img-element -- local brand PNG lockup */}
        <img
          src="/brand/jobilly-logo-arrow-name.png"
          alt=""
          className={styles.brandLockup}
          draggable={false}
          aria-hidden
        />
        <span className={styles.brandSub}>Candidate Portal</span>
      </Link>

      <nav className={styles.nav} aria-label="Candidate navigation">
        {CANDIDATE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isCandidateNavActive(pathname, item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            >
              <span className={styles.navIcon} aria-hidden>
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.href === "/dashboard/applications" && unreadApplications > 0 ? (
                <span className={styles.navBadge}>{unreadApplications}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <ThemeToggle compact />
      </div>
      </aside>
    </>
  );
}
