"use client";

import Link from "next/link";
import type { Route } from "next";
import styles from "./jobilly-logo.module.css";

/** Intrinsic aspect of the arrow mark. */
const MARK_ASPECT = 348 / 174;

/** Intrinsic aspect of the arrow + "Jobilly.ai" lockup. */
const LOCKUP_ASPECT = 215 / 157;

/** Extra height the wordmark adds below the mark in the lockup. */
const LOCKUP_TEXT_HEIGHT = 24;

type JobillyLogoProps = {
  href?: Route;
  showWordmark?: boolean;
  markSize?: number;
  subtitle?: string;
  onDark?: boolean;
  className?: string;
};

export function JobillyLogo({
  href = "/" as Route,
  showWordmark = true,
  markSize = 32,
  subtitle,
  onDark = false,
  className,
}: JobillyLogoProps) {
  const imageHeight = showWordmark ? markSize + LOCKUP_TEXT_HEIGHT : markSize;
  const imageWidth = Math.round(imageHeight * (showWordmark ? LOCKUP_ASPECT : MARK_ASPECT));
  const imageSrc = showWordmark
    ? "/brand/jobilly-logo-arrow-name.png"
    : "/brand/jobilly-mark-arrow.png";

  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- local brand PNG mark */}
      <img
        src={imageSrc}
        alt=""
        width={imageWidth}
        height={imageHeight}
        className={styles.mark}
        draggable={false}
        aria-hidden
      />
      {subtitle ? (
        <span className={`${styles.subtitle} ${onDark ? styles.subtitleOnDark : ""}`}>
          {subtitle}
        </span>
      ) : null}
    </>
  );

  const rootClass = [styles.logo, className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={rootClass} aria-label="Jobilly.ai home">
        {content}
      </Link>
    );
  }

  return <div className={rootClass}>{content}</div>;
}
