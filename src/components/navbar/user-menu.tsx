"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/lib/auth/session";
import { formatDisplayName } from "@/lib/format-display-name";
import styles from "./navbar.module.css";

type UserMenuProps = {
  user: SessionUser;
  profileHref?: "/dashboard/profile" | "/admin/profile";
  logoutActionFn?: typeof logoutAction;
  showLogout?: boolean;
};

export function UserMenu({
  user,
  profileHref = "/dashboard/profile",
  logoutActionFn = logoutAction,
  showLogout = true,
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const displayName = user.name
    ? formatDisplayName(user.name)
    : formatDisplayName(user.email.split("@")[0] ?? user.email);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        type="button"
        className={styles.userMenuTrigger}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.userIcon} aria-hidden>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user avatar from storage
            <img src={user.avatarUrl} alt="" className={styles.userAvatarImage} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path
                d="M5 20C5 16.134 8.134 13 12 13C15.866 13 19 16.134 19 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
        <span className={styles.userName}>{displayName}</span>
        <svg
          className={`${styles.userChevron} ${open ? styles.userChevronOpen : ""}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className={styles.userDropdown} role="menu">
          <div className={styles.userDropdownHeader}>
            <span className={styles.userDropdownName}>{displayName}</span>
            <span className={styles.userDropdownEmail}>{user.email}</span>
          </div>
          <Link
            href={profileHref}
            className={styles.userDropdownItem}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Edit profile
          </Link>
          {showLogout && (
            <form action={logoutActionFn}>
              <button type="submit" className={styles.userDropdownItemLogout} role="menuitem">
                Log out
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
