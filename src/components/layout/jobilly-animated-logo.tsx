"use client";

import { useId } from "react";
import styles from "./jobilly-animated-logo.module.css";

type JobillyAnimatedLogoProps = {
  loopDuration?: number;
  glowIntensity?: number;
  sweepColor?: string;
  className?: string;
  label?: string;
};

export function JobillyAnimatedLogo({
  loopDuration = 1.2,
  glowIntensity = 0.8,
  sweepColor = "#00f2fe",
  className,
  label = "Loading Jobilly.ai",
}: JobillyAnimatedLogoProps) {
  const rawId = useId().replace(/:/g, "");
  const scope = `jobilly-logo-${rawId}`;

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="status"
      aria-label={label}
      style={
        {
          "--jb-loop-duration": `${loopDuration}s`,
          "--jb-glow": String(glowIntensity),
          "--jb-sweep": sweepColor,
        } as React.CSSProperties
      }
    >
      <svg
        viewBox="0 0 200 160"
        className={styles.svg}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${scope}-grad-primary`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2c60ff" />
            <stop offset="100%" stopColor="#1a4bdb" />
          </linearGradient>
          <linearGradient id={`${scope}-grad-accent`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5ec5ff" />
            <stop offset="100%" stopColor="#00b4d8" />
          </linearGradient>
          <filter id={`${scope}-glow`}>
            <feGaussianBlur stdDeviation={3 * glowIntensity} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <clipPath id={`${scope}-logo-clip`}>
            <rect x="40" y="24" width="120" height="72" rx="8" />
          </clipPath>
          <linearGradient id={`${scope}-sweep-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="45%" stopColor={sweepColor} stopOpacity="0" />
            <stop offset="50%" stopColor={sweepColor} stopOpacity="0.85" />
            <stop offset="55%" stopColor={sweepColor} stopOpacity="0" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        <g className={styles.arrowGroup} data-scope={scope}>
          <g className={styles.trail1}>
            <rect x="52" y="48" width="44" height="10" rx="5" fill={`url(#${scope}-grad-accent)`} opacity="0.55" />
          </g>
          <g className={styles.trail2}>
            <rect x="44" y="54" width="32" height="7" rx="4" fill={`url(#${scope}-grad-accent)`} opacity="0.4" />
          </g>
          <g className={styles.trail3}>
            <rect x="36" y="58" width="22" height="5" rx="3" fill={`url(#${scope}-grad-accent)`} opacity="0.28" />
          </g>

          <circle className={styles.dropletLeft} cx="48" cy="66" r="4.5" fill="#5ec5ff" />
          <circle className={styles.dropletSmall} cx="58" cy="72" r="2.5" fill="#00b4d8" />

          <g className={styles.arrowHead}>
            <path
              d="M 65,42 H 104 V 62 H 65 C 59.5,62 55,57.5 55,52 Z"
              fill={`url(#${scope}-grad-primary)`}
            />
            <path
              d="M 100,35 C 100,31.5 104,29.5 107,31.5 L 142,56.5 C 145,58.5 145,61.5 142,63.5 L 107,88.5 Z"
              fill={`url(#${scope}-grad-primary)`}
              filter={`url(#${scope}-glow)`}
            />
          </g>
        </g>

        <g clipPath={`url(#${scope}-logo-clip)`}>
          <rect
            className={styles.sweep}
            x="0"
            y="20"
            width="80"
            height="80"
            fill={`url(#${scope}-sweep-grad)`}
            opacity="0.45"
          />
        </g>

        <text
          x="100"
          y="126"
          textAnchor="middle"
          fill="#2c60ff"
          fontWeight="700"
          fontSize="25"
          className={styles.wordmark}
        >
          Jobilly.ai
        </text>
      </svg>
    </div>
  );
}
