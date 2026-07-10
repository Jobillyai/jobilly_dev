"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Compass,
  Briefcase,
  LayoutDashboard,
  UserCircle,
} from "lucide-react";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import styles from "./candidate-sidebar.module.css";

const navItems = [
  {
    href: "/dashboard" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/career-advisory" as const,
    label: "Career Advisory",
    icon: Compass,
    exact: false,
  },
  {
    href: "/dashboard/applications" as const,
    label: "Applications",
    icon: Briefcase,
    exact: false,
  },
  {
    href: "/dashboard/calendar" as const,
    label: "Calendar",
    icon: Calendar,
    exact: false,
  },
  {
    href: "/dashboard/profile" as const,
    label: "Profile",
    icon: UserCircle,
    exact: false,
  },
] as const;

type CandidateSidebarProps = {
  unreadApplications?: number;
};

export function CandidateSidebar({ unreadApplications = 0 }: CandidateSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className={styles.sidebar}>
      <JobillyLogo
        href="/dashboard"
        markSize={40}
        className={styles.brand}
      />

      <nav className={styles.nav} aria-label="Candidate navigation">
        {navItems.map((item) => {
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
              {item.href === "/dashboard/applications" && unreadApplications > 0 ? (
                <span className={styles.navBadge}>{unreadApplications}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
