"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { JOBILLY_LOTTIE_LOADER_SRC } from "@/lib/ui/lottie-loader";
import styles from "./lottie-loader.module.css";

type LottieLoaderProps = {
  size?: number;
  className?: string;
  label?: string;
};

export function LottieLoader({
  size = 160,
  className,
  label = "Loading Jobilly.ai",
}: LottieLoaderProps) {
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    >
      <DotLottieReact
        src={JOBILLY_LOTTIE_LOADER_SRC}
        loop
        autoplay
        className={styles.animation}
      />
    </div>
  );
}
