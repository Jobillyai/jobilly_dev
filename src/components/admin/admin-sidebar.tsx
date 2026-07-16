"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Menu,
  ReceiptText,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import styles from "./admin-sidebar.module.css";

const navItems = [
  {
    href: "/admin" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/candidates" as const,
    label: "Candidate Details",
    icon: Users,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/jobs" as const,
    label: "Apply for jobs",
    icon: Briefcase,
    exact: false,
    jobApplyOnly: true,
    managerOnly: false,
  },
  {
    href: "/admin/requests" as const,
    label: "Service Requests",
    icon: Inbox,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/tasks" as const,
    label: "Tasks",
    icon: ClipboardList,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/calendar" as const,
    label: "Calendar",
    icon: Calendar,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/transactions" as const,
    label: "Transactions",
    icon: ReceiptText,
    exact: false,
    jobApplyOnly: false,
    managerOnly: true,
  },
  {
    href: "/admin/profile" as const,
    label: "My profile",
    icon: UserCircle,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
];

type AdminSidebarProps = {
  showJobApplyNav?: boolean;
  showManagerNav?: boolean;
};

export function AdminSidebar({
  showJobApplyNav = true,
  showManagerNav = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = navItems.filter(
    (item) =>
      (!item.jobApplyOnly || showJobApplyNav) &&
      (!item.managerOnly || showManagerNav),
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(href: string, exact: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

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
          const active = isActive(item.href, item.exact);

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
    </>
  );
}
