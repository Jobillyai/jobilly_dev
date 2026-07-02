"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/server/db/supabase-browser";
import type { SessionUser } from "@/lib/auth/session";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import { UserMenu } from "./user-menu";
import styles from "./navbar.module.css";

type AppNavbarProps = {
  user: SessionUser | null;
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
  { href: "/contact", label: "Contact Us" },
] as const;

function NavLinks() {
  return (
    <div className={styles.navLinks}>
      {NAV_LINKS.map((link) => (
        <Link key={link.label} href={link.href} className={styles.navLink}>
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
      <div className={styles.navActions}>
        <Link href="/signup" className={styles.navBtnPrimary}>
          Sign up
        </Link>
      </div>
    );
  }

  if (pathname === "/signup") {
    return (
      <div className={styles.navActions}>
        <Link href="/login" className={styles.navBtnPrimary}>
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.navActions}>
      <Link href="/login" className={styles.navBtnGhost}>
        Log in
      </Link>
      <Link href="/signup" className={styles.navBtnPrimary}>
        Sign up
      </Link>
    </div>
  );
}

export function AppNavbar({ user: serverUser, homeHref = "/" }: AppNavbarProps) {
  const [user, setUser] = useState<SessionUser | null>(serverUser);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setUser(serverUser);
  }, [serverUser]);

  useEffect(() => {
    const supabase = createClient();

    async function syncUser() {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        setUser(toSessionUser(data.user));
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
        <JobillyLogo href={user ? homeHref : "/"} height={32} className={styles.navLogo} />
        {!user ? <NavLinks /> : null}
      </div>

      <div className={styles.navRight}>
        {user ? (
          <div className={styles.navActions}>
            <Link href={homeHref === "/admin" ? "/admin" : "/dashboard"} className={styles.navBtnGhost}>
              Dashboard
            </Link>
            <UserMenu user={user} />
          </div>
        ) : (
          <GuestNavActions />
        )}
      </div>
    </nav>
  );
}
