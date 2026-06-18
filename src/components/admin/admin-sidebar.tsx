"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UserCircle,
  Users,
} from "lucide-react";
import { adminLogoutAction } from "@/server/actions/admin-auth";
import styles from "./admin-sidebar.module.css";

const navItems = [
  {
    href: "/admin" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/candidates" as const,
    label: "Candidate Details",
    icon: Users,
    exact: false,
  },
  {
    href: "/admin/jobs" as const,
    label: "Job Scraping",
    icon: Briefcase,
    exact: false,
  },
  {
    href: "/admin/tasks" as const,
    label: "Tasks",
    icon: ClipboardList,
    exact: false,
  },
  {
    href: "/admin/calendar" as const,
    label: "Calendar",
    icon: Calendar,
    exact: false,
  },
  {
    href: "/admin/profile" as const,
    label: "Admin Profile",
    icon: UserCircle,
    exact: false,
  },
];

export function AdminSidebar() {
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
          <span className={styles.brandSub}>Admin panel</span>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Admin navigation">
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
        <form action={adminLogoutAction}>
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
