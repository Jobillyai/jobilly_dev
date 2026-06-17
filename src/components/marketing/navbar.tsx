"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./welcome-page.module.css";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
      <div className={styles.navLogo}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
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
      </div>
      <div className={styles.navRight}>
        <div className={styles.navBadge}>&#x2726; Launching Soon</div>
        <Link href="/login" className={styles.navLoginLink}>
          Log in
        </Link>
        <Link href="/signup" className={styles.navCta}>
          Get Early Access
        </Link>
      </div>
    </nav>
  );
}
