"use client";

import type { CSSProperties } from "react";
import styles from "./jobilly-logo-loader.module.css";

type JobillyLogoLoaderProps = {
  size?: 512 | 1080 | number;
  className?: string;
  label?: string;
};

export function JobillyLogoLoader({
  size = 512,
  className,
  label = "Loading Jobilly.ai",
}: JobillyLogoLoaderProps) {
  const assetSize = size >= 720 ? 1080 : 512;
  const iconSrc = "/brand/loader/jobilly-loader-icon.png";
  const wordmarkSrc = "/brand/loader/jobilly-loader-wordmark.png";

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={{ "--loader-size": `${size}px` } as CSSProperties}
      role="status"
      aria-label={label}
    >
      <div className={styles.stage}>
        <div className={styles.motionLayer} aria-hidden>
          <span className={`${styles.trail} ${styles.trail1}`} />
          <span className={`${styles.trail} ${styles.trail2}`} />
          <span className={`${styles.trail} ${styles.trail3}`} />
          <span className={`${styles.droplet} ${styles.droplet1}`} />
          <span className={`${styles.droplet} ${styles.droplet2}`} />
          <span className={`${styles.droplet} ${styles.droplet3}`} />
          <span className={`${styles.droplet} ${styles.droplet4}`} />
        </div>

        <div className={styles.iconWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element -- animated raster logo must stay pixel-exact */}
          <img
            src={iconSrc}
            alt=""
            className={styles.iconImg}
            width={assetSize}
            height={Math.round(assetSize * 0.58)}
            draggable={false}
          />
        </div>

        <div className={styles.wordmarkWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element -- animated raster logo must stay pixel-exact */}
          <img
            src={wordmarkSrc}
            alt=""
            className={styles.wordmarkImg}
            width={assetSize}
            height={Math.round(assetSize * 0.46)}
            draggable={false}
          />
        </div>

        <div className={styles.sweep} aria-hidden />
        <div className={styles.bloom} aria-hidden />
      </div>
    </div>
  );
}
