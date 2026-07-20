"use client";

import { useEffect, useState } from "react";
import { LottieLoader } from "./lottie-loader";
import styles from "./site-boot-loader.module.css";

const BOOT_KEY = "jobilly:booted";

export function SiteBootLoader() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(BOOT_KEY)) {
      return;
    }

    setVisible(true);

    function finish() {
      sessionStorage.setItem(BOOT_KEY, "1");
      setFadeOut(true);
      window.setTimeout(() => setVisible(false), 220);
    }

    if (document.readyState === "complete") {
      finish();
      return;
    }

    window.addEventListener("load", finish, { once: true });
    return () => window.removeEventListener("load", finish);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`${styles.overlay} ${fadeOut ? styles.overlayFadeOut : ""}`}
      aria-live="polite"
      aria-busy={!fadeOut}
    >
      <LottieLoader size={180} />
    </div>
  );
}
