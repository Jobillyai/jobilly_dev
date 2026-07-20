"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getAdminNavItems, isAdminNavActive } from "@/components/admin/admin-nav";
import { usePrefetchRoutes } from "@/lib/use-prefetch-routes";
import styles from "./admin-mobile-nav.module.css";

type AdminMobileNavProps = {
  showJobApplyNav?: boolean;
  showManagerNav?: boolean;
};

export function AdminMobileNav({
  showJobApplyNav = true,
  showManagerNav = false,
}: AdminMobileNavProps) {
  const pathname = usePathname();
  const navItems = getAdminNavItems({ showJobApplyNav, showManagerNav });
  const navRoutes = useMemo(
    () => navItems.map((item) => item.href),
    [navItems],
  );
  usePrefetchRoutes(navRoutes);

  return (
    <nav className={styles.bar} aria-label="Mobile admin navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isAdminNavActive(pathname, item.href, item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.link} ${active ? styles.linkActive : ""}`}
          >
            <span className={styles.iconWrap} aria-hidden>
              <Icon size={20} strokeWidth={2} />
            </span>
            <span className={styles.label}>{item.mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
