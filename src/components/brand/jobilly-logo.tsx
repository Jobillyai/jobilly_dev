"use client";

import Link from "next/link";
import { useId } from "react";
import { JobillyMark } from "./jobilly-mark";
import styles from "./jobilly-logo.module.css";

type JobillyLogoProps = {
  href?: string;
  showWordmark?: boolean;
  markSize?: number;
  subtitle?: string;
  onDark?: boolean;
  className?: string;
};

export function JobillyLogo({
  href = "/",
  showWordmark = true,
  markSize = 32,
  subtitle,
  onDark = false,
  className,
}: JobillyLogoProps) {
  const gradientId = useId().replace(/:/g, "");

  const content = (
    <>
      <JobillyMark size={markSize} gradientId={gradientId} className={styles.mark} />
      {showWordmark || subtitle ? (
        <span className={styles.wordmarkBlock}>
          {showWordmark ? (
            <span className={`${styles.wordmark} ${onDark ? styles.wordmarkOnDark : ""}`}>
              jobilly<span className={onDark ? styles.wordmarkAccentOnDark : styles.wordmarkAccent}>.ai</span>
            </span>
          ) : null}
          {subtitle ? (
            <span className={`${styles.subtitle} ${onDark ? styles.subtitleOnDark : ""}`}>
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  const rootClass = [styles.logo, className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={rootClass}>
        {content}
      </Link>
    );
  }

  return <div className={rootClass}>{content}</div>;
}
