"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getAdminNavItems, isAdminNavActive } from "@/components/admin/admin-nav";
import { usePrefetchRoutes } from "@/lib/use-prefetch-routes";
import styles from "./admin-sidebar.module.css";

type AdminSidebarProps = {
  showJobApplyNav?: boolean;
  showManagerNav?: boolean;
};

export function AdminSidebar({
  showJobApplyNav = true,
  showManagerNav = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleNavItems = getAdminNavItems({ showJobApplyNav, showManagerNav });
  const navRoutes = useMemo(
    () => visibleNavItems.map((item) => item.href),
    [visibleNavItems],
  );
  usePrefetchRoutes(navRoutes);

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.brand} aria-label="Jobilly.ai home">
        {/* eslint-disable-next-line @next/next/no-img-element -- local brand PNG lockup */}
        <img
          src="/brand/jobilly-logo-arrow-name.png"
          alt=""
          className={styles.brandLockup}
          draggable={false}
          aria-hidden
        />
        <span className={styles.brandSub}>Admin Portal</span>
      </Link>

      <nav className={styles.nav} aria-label="Admin navigation">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isAdminNavActive(pathname, item.href, item.exact);

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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
