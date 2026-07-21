"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/server/db/supabase-browser";
import { FastLogoutButton } from "@/components/auth/fast-logout-button";
import type { SessionUser } from "@/lib/auth/session";
import type { AdminUser } from "@/lib/auth/admin";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "./user-menu";
import styles from "./navbar.module.css";

type AppNavbarProps = {
  user: SessionUser | null;
  adminUser?: AdminUser | null;
  homeHref?: "/" | "/dashboard" | "/admin";
};

function toSessionUser(authUser: User): SessionUser | null {
  if (!authUser.email) {
    return null;
  }

  return {
    id: authUser.id,
    email: authUser.email,
    name:
      typeof authUser.user_metadata?.name === "string"
        ? authUser.user_metadata.name
        : undefined,
    avatarUrl:
      typeof authUser.user_metadata?.avatar_url === "string"
        ? authUser.user_metadata.avatar_url
        : undefined,
  };
}

const NAV_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/communities", label: "Communities" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact Us" },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className={styles.navLinks}>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className={styles.navLink}
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function GuestNavActions() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <div className={`${styles.navActions} ${styles.guestNavActions} ${styles.guestNavActionsCompact}`}>
        <Link href="/signup" className={styles.navBtnPrimary}>
          Sign up
        </Link>
      </div>
    );
  }

  if (pathname === "/signup") {
    return (
      <div className={`${styles.navActions} ${styles.guestNavActions} ${styles.guestNavActionsCompact}`}>
        <Link href="/login" className={styles.navBtnPrimary}>
          Log in
        </Link>
      </div>
    );
  }

  if (pathname === "/forgot-password") {
    return (
      <div className={`${styles.navActions} ${styles.guestNavActions} ${styles.guestNavActionsCompact}`}>
        <Link href="/login" className={styles.navBtnGhost}>
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className={`${styles.navActions} ${styles.guestNavActions}`}>
      <Link href="/login" className={styles.navBtnGhost}>
        Log in
      </Link>
      <Link href="/signup" className={styles.navBtnPrimary}>
        Sign up
      </Link>
    </div>
  );
}

function GuestMobileMenuActions({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  if (pathname === "/forgot-password") {
    return (
      <div className={styles.mobileMenuActions}>
        <Link href="/login" className={styles.navBtnPrimary} onClick={onNavigate}>
          Log in
        </Link>
      </div>
    );
  }

  if (pathname === "/login") {
    return (
      <div className={styles.mobileMenuActions}>
        <Link href="/signup" className={styles.navBtnPrimary} onClick={onNavigate}>
          Sign up
        </Link>
      </div>
    );
  }

  if (pathname === "/signup") {
    return (
      <div className={styles.mobileMenuActions}>
        <Link href="/login" className={styles.navBtnPrimary} onClick={onNavigate}>
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.mobileMenuActions}>
      <Link href="/login" className={styles.navBtnGhost} onClick={onNavigate}>
        Log in
      </Link>
      <Link href="/signup" className={styles.navBtnPrimary} onClick={onNavigate}>
        Sign up
      </Link>
    </div>
  );
}

export function AppNavbar({
  user: serverUser,
  homeHref = "/",
}: AppNavbarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(serverUser);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const profileHref = isAdminRoute ? "/admin/profile" : "/dashboard/profile";
  const logoutRedirect = isAdminRoute ? "/admin/login" : "/login";
  const onPortal = pathname.startsWith("/dashboard") || isAdminRoute;
  const showPortalLink = Boolean(user) && !onPortal && homeHref !== "/";

  useEffect(() => {
    setUser(serverUser);
  }, [serverUser]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const supabase = createClient();

    async function syncUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUser(toSessionUser(session.user));
      } else {
        setUser(null);
      }
    }

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
      <div className={styles.navLeft}>
        <JobillyLogo href={user ? homeHref : "/"} className={styles.navLogo} markSize={34} />
        {!user ? <NavLinks /> : null}
      </div>

      <div className={styles.navRight}>
        <ThemeToggle />
        {user ? (
          <div className={styles.navActions}>
            {showPortalLink ? (
              <Link href={homeHref} className={`${styles.navBtnGhost} ${styles.navBtnCompact}`}>
                Dashboard
              </Link>
            ) : null}
            <UserMenu
              user={user}
              profileHref={profileHref}
              logoutRedirect={logoutRedirect}
              showLogout={false}
            />
            <FastLogoutButton
              redirectTo={logoutRedirect}
              className={`${styles.navBtnGhost} ${styles.navLogoutBtn}`}
            >
              Log out
            </FastLogoutButton>
          </div>
        ) : (
          <>
            <GuestNavActions />
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={mobileMenuOpen}
              aria-controls="app-navbar-mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </>
        )}
      </div>

      {!user && mobileMenuOpen ? (
        <>
          <button
            type="button"
            className={styles.menuOverlay}
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div id="app-navbar-mobile-menu" className={styles.mobileMenu}>
            <NavLinks onNavigate={() => setMobileMenuOpen(false)} />
            <GuestMobileMenuActions onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </>
      ) : null}
    </nav>
  );
}
