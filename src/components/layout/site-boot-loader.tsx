"use client";

import { useEffect, useState } from "react";
import { JobillyLogoLoader } from "./jobilly-logo-loader";
import styles from "./site-boot-loader.module.css";

export function SiteBootLoader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    function finish() {
      setFadeOut(true);
      window.setTimeout(() => setVisible(false), 280);
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
      <JobillyLogoLoader size={512} />
    </div>
  );
}
