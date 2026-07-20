"use client";

import { useEffect, useState } from "react";
import { POST_AUTH_WELCOME_COOKIE } from "@/lib/auth/post-auth-welcome";
import styles from "./site-boot-loader.module.css";

const MIN_VISIBLE_MS = 2200;
const FADE_MS = 900;
const WELCOME_PENDING_KEY = "jb_welcome_pending";

function readWelcomeCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${POST_AUTH_WELCOME_COOKIE}=`));

  return Boolean(match && match.split("=")[1] === "1");
}

function clearWelcomeCookie() {
  document.cookie = `${POST_AUTH_WELCOME_COOKIE}=; Max-Age=0; path=/`;
}

/** Survives React Strict Mode remount (cookie alone is consumed too early). */
function claimWelcomeSplash(): boolean {
  try {
    if (sessionStorage.getItem(WELCOME_PENDING_KEY) === "1") {
      return true;
    }
  } catch {
    // ignore
  }

  if (!readWelcomeCookie()) {
    return false;
  }

  clearWelcomeCookie();
  try {
    sessionStorage.setItem(WELCOME_PENDING_KEY, "1");
  } catch {
    // ignore
  }
  return true;
}

function clearWelcomePending() {
  try {
    sessionStorage.removeItem(WELCOME_PENDING_KEY);
  } catch {
    // ignore
  }
}

type PostAuthWelcomeSplashProps = {
  name: string;
};

/**
 * Netflix-style splash after login/signup: “Hello” + display name, then ease into the portal.
 */
export function PostAuthWelcomeSplash({ name }: PostAuthWelcomeSplashProps) {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!claimWelcomeSplash()) {
      return;
    }

    setVisible(true);
    setFadeOut(false);
    let hideTimer: number | undefined;
    let cancelled = false;

    const fadeTimer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setFadeOut(true);
      hideTimer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        clearWelcomePending();
        setVisible(false);
      }, FADE_MS);
    }, MIN_VISIBLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(fadeTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  const greetingName = name.trim() || "there";

  return (
    <div
      className={`${styles.overlay} ${fadeOut ? styles.overlayFadeOut : ""}`}
      aria-live="polite"
      aria-busy={!fadeOut}
      role="status"
    >
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.stage}>
        <div className={`${styles.line} ${fadeOut ? styles.lineOut : styles.lineIn}`}>
          <p className={styles.tagline}>Hello</p>
        </div>
        <div
          className={`${styles.line} ${styles.taglineLine} ${
            fadeOut ? styles.lineOut : styles.lineIn
          }`}
        >
          <p className={styles.brand}>{greetingName}</p>
        </div>
      </div>
    </div>
  );
}
