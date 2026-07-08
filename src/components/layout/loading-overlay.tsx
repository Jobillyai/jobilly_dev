"use client";

import { ArrowLoader } from "./arrow-loader";
import styles from "./loading-overlay.module.css";

type LoadingOverlayProps = {
  label?: string;
  fixed?: boolean;
};

export function LoadingOverlay({
  label = "Loading Jobilly.ai",
  fixed = true,
}: LoadingOverlayProps) {
  return (
    <div
      className={fixed ? styles.overlayFixed : styles.overlayInline}
      aria-live="polite"
      aria-busy="true"
    >
      <ArrowLoader label={label} />
    </div>
  );
}
