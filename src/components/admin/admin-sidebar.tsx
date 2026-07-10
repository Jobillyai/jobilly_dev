"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  UserCircle,
  Users,
} from "lucide-react";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import styles from "./admin-sidebar.module.css";

const navItems = [
  {
    href: "/admin" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    jobApplyOnly: false,
  },
  {
    href: "/admin/candidates" as const,
    label: "Candidate Details",
    icon: Users,
    exact: false,
    jobApplyOnly: false,
  },
  {
    href: "/admin/jobs" as const,
    label: "Apply for jobs",
    icon: Briefcase,
    exact: false,
    jobApplyOnly: true,
  },
  {
    href: "/admin/requests" as const,
    label: "Service Requests",
    icon: Inbox,
    exact: false,
    jobApplyOnly: false,
  },
  {
    href: "/admin/tasks" as const,
    label: "Tasks",
    icon: ClipboardList,
    exact: false,
    jobApplyOnly: false,
  },
  {
    href: "/admin/calendar" as const,
    label: "Calendar",
    icon: Calendar,
    exact: false,
    jobApplyOnly: false,
  },
  {
    href: "/admin/profile" as const,
    label: "My profile",
    icon: UserCircle,
    exact: false,
    jobApplyOnly: false,
  },
];

type AdminSidebarProps = {
  showJobApplyNav?: boolean;
};

export function AdminSidebar({ showJobApplyNav = true }: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter(
    (item) => !item.jobApplyOnly || showJobApplyNav,
  );

  function isActive(href: string, exact: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className={styles.sidebar}>
      <JobillyLogo
        href="/admin"
        markSize={40}
        subtitle="Admin portal"
        onDark
        className={styles.brand}
      />

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
  );
}
