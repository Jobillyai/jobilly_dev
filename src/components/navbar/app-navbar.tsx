"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/server/db/supabase-browser";
import type { SessionUser } from "@/lib/auth/session";
import { UserMenu } from "./user-menu";
import styles from "./navbar.module.css";

type AppNavbarProps = {
  user: SessionUser | null;
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
  { href: "/#contact", hash: "contact", label: "Contact Us" },
] as const;

type NavLinkItem = (typeof NAV_LINKS)[number];

function scrollToSection(hash: string) {
  document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
  window.history.replaceState(null, "", `#${hash}`);
}

function NavLinks() {
  const pathname = usePathname();
  const onHomePage = pathname === "/";

  function renderLink(link: NavLinkItem) {
    if ("hash" in link && link.hash && onHomePage) {
      return (
        <a
          key={link.label}
          href={`#${link.hash}`}
          className={styles.navLink}
          onClick={(event) => {
            event.preventDefault();
            scrollToSection(link.hash!);
          }}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link key={link.label} href={link.href} className={styles.navLink}>
        {link.label}
      </Link>
    );
  }

  return <div className={styles.navLinks}>{NAV_LINKS.map(renderLink)}</div>;
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
    <>
      <div className={styles.navBadge}>&#x2726; Launching Soon</div>
      <div className={styles.navActions}>
        <Link href="/login" className={styles.navBtnGhost}>
          Log in
        </Link>
        <Link href="/signup" className={styles.navBtnPrimary}>
          Sign up
        </Link>
      </div>
    </>
  );
}

export function AppNavbar({ user: serverUser }: AppNavbarProps) {
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
        <Link href={user ? "/dashboard" : "/"} className={styles.navLogo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <rect width="28" height="28" rx="8" fill="#1877F2" />
            <path
              d="M8 14C8 10.686 10.686 8 14 8C17.314 8 20 10.686 20 14C20 17.314 17.314 20 14 20"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="14" cy="14" r="2.5" fill="white" />
            <path d="M14 20V22" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span className={styles.navLogoText}>
            jobilly<span className={styles.navLogoTextDark}>.ai</span>
          </span>
        </Link>
        <NavLinks />
      </div>

      <div className={styles.navRight}>
        {user ? (
          <div className={styles.navActions}>
            <Link href="/dashboard" className={styles.navBtnGhost}>
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
