"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
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

  return (
    <aside className={styles.sidebar}>
      <JobillyLogo
        href="/dashboard"
        markSize={40}
        className={styles.brand}
      />

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
  );
}
