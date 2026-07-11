"use client";

import { WelcomeWaveMesh } from "@/components/marketing/welcome-hero-mesh";
import styles from "./page-wave-background.module.css";

type PageWaveBackgroundProps = {
  className?: string;
  direction?: "bl-tr" | "tl-br";
  lineCount?: number;
  extent?: "normal" | "far" | "strip";
};

export function PageWaveBackground({
  className,
  direction = "tl-br",
  lineCount = 52,
  extent = "normal",
}: PageWaveBackgroundProps) {
  return (
    <div className={`${styles.root} ${className ?? ""}`.trim()} aria-hidden>
      <WelcomeWaveMesh
        direction={direction}
        lineCount={lineCount}
        extent={extent}
      />
    </div>
  );
}
