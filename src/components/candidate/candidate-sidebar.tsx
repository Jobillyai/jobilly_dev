"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Compass,
  Briefcase,
  LayoutDashboard,
  LogOut,
  UserCircle,
} from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { LogoutForm, LogoutSubmitButton } from "@/components/auth/logout-form";
import { formatDisplayName } from "@/lib/format-display-name";
import type { SessionUser } from "@/lib/auth/session";
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
  user: SessionUser;
  unreadApplications?: number;
};

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return `${parts[0][0]}${parts[parts.length - 1]![0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function CandidateSidebar({ user, unreadApplications = 0 }: CandidateSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/jobilly.png"
          alt="Jobilly AI"
          className={styles.brandLogo}
          height={36}
          width={75}
        />
        <span className={styles.brandText}>jobilly.ai</span>
      </Link>

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

      <div className={styles.footer}>
        <div className={styles.userBlock}>
          <div className={styles.userAvatar}>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className={styles.userAvatarImage}
              />
            ) : (
              getInitials(user.name, user.email)
            )}
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>
              {user.name ? formatDisplayName(user.name) : user.email.split("@")[0]}
            </span>
          </div>
        </div>
        <LogoutForm action={logoutAction}>
          <LogoutSubmitButton className={styles.signOutBtn}>
            <span className={styles.navIcon} aria-hidden>
              <LogOut size={18} strokeWidth={2} />
            </span>
            <span className={styles.navLabel}>Sign out</span>
          </LogoutSubmitButton>
        </LogoutForm>
      </div>
    </aside>
  );
}
