"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Compass,
  FileText,
  Briefcase,
  LayoutDashboard,
  LogOut,
  UserCircle,
} from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import styles from "../admin/admin-sidebar.module.css";

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
    href: "/dashboard/ats-resume-score" as const,
    label: "ATS Score",
    icon: FileText,
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
];

export function CandidateSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className={styles.adminSidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>Jb</div>
        <div>
          <span className={styles.brandText}>jobilly.ai</span>
          <span className={styles.brandSub}>Candidate portal</span>
        </div>
      </div>

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
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <form action={logoutAction}>
          <button type="submit" className={styles.signOutBtn}>
            <span className={styles.navIcon} aria-hidden>
              <LogOut size={18} strokeWidth={2} />
            </span>
            <span className={styles.navLabel}>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
