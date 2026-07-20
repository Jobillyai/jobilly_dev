"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CANDIDATE_NAV_ITEMS,
  CANDIDATE_NAV_ROUTES,
  isCandidateNavActive,
} from "@/components/candidate/candidate-nav";
import { usePrefetchRoutes } from "@/lib/use-prefetch-routes";
import styles from "./candidate-mobile-nav.module.css";

type CandidateMobileNavProps = {
  unreadApplications?: number;
};

export function CandidateMobileNav({
  unreadApplications = 0,
}: CandidateMobileNavProps) {
  const pathname = usePathname();
  usePrefetchRoutes(CANDIDATE_NAV_ROUTES);

  return (
    <nav className={styles.bar} aria-label="Mobile candidate navigation">
      {CANDIDATE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isCandidateNavActive(pathname, item.href, item.exact);
        const showBadge =
          item.href === "/dashboard/applications" && unreadApplications > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${active ? styles.linkActive : ""}`}
          >
            <span className={styles.iconWrap} aria-hidden>
              <Icon size={20} strokeWidth={2} />
              {showBadge ? (
                <span className={styles.badge}>
                  {unreadApplications > 9 ? "9+" : unreadApplications}
                </span>
              ) : null}
            </span>
            <span className={styles.label}>{item.mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
