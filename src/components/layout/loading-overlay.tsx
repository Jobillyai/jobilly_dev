"use client";

import { LottieLoader } from "./lottie-loader";
import styles from "./loading-overlay.module.css";

type LoadingOverlayProps = {
  label?: string;
  fixed?: boolean;
  size?: number;
};

export function LoadingOverlay({
  label = "Loading Jobilly.ai",
  fixed = true,
  size = 160,
}: LoadingOverlayProps) {
  return (
    <div
      className={fixed ? styles.overlayFixed : styles.overlayInline}
      aria-live="polite"
      aria-busy="true"
    >
      <LottieLoader label={label} size={size} />
    </div>
  );
}
