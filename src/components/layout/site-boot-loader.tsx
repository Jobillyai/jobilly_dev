"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./site-boot-loader.module.css";

const MIN_VISIBLE_MS = 2200;
const FADE_MS = 900;

export function SiteBootLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Only on the marketing welcome page — not every site reload.
    if (pathname !== "/") {
      setVisible(false);
      setFadeOut(false);
      return;
    }

    setVisible(true);
    setFadeOut(false);
    const startedAt = performance.now();
    const timers: { fade?: number; hide?: number } = {};
    let cancelled = false;

    function finish() {
      if (cancelled) {
        return;
      }

      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

      timers.fade = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        setFadeOut(true);
        timers.hide = window.setTimeout(() => {
          if (!cancelled) {
            setVisible(false);
          }
        }, FADE_MS);
      }, wait);
    }

    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", finish);
      if (timers.fade) window.clearTimeout(timers.fade);
      if (timers.hide) window.clearTimeout(timers.hide);
    };
  }, [pathname]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`${styles.overlay} ${fadeOut ? styles.overlayFadeOut : ""}`}
      aria-live="polite"
      aria-busy={!fadeOut}
      role="status"
    >
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.stage}>
        <div
          className={`${styles.line} ${styles.brandLine} ${
            fadeOut ? styles.lineOut : styles.lineIn
          }`}
        >
          <p className={styles.brand}>Jobilly.AI</p>
        </div>
        <div
          className={`${styles.line} ${styles.taglineLine} ${
            fadeOut ? styles.lineOut : styles.lineIn
          }`}
        >
          <p className={styles.tagline}>Graduate ready. Job ready.</p>
        </div>
      </div>
    </div>
  );
}
