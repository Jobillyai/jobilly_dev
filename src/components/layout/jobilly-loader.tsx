import type { CSSProperties } from "react";
import styles from "./jobilly-loader.module.css";

type LoaderSegment =
  | { type: "letter"; char: string; accent?: boolean }
  | { type: "gap" };

const SEGMENTS: LoaderSegment[] = [
  ..."Jobilly".split("").map((char) => ({ type: "letter" as const, char })),
  { type: "gap" },
  ..."AI".split("").map((char) => ({ type: "letter" as const, char, accent: true })),
];

type JobillyLoaderProps = {
  variant?: "default" | "light" | "inverse";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

export function JobillyLoader({
  variant = "default",
  size = "lg",
  className,
  label = "Loading Jobilly AI",
}: JobillyLoaderProps) {
  let letterIndex = 0;

  return (
    <span
      className={[
        styles.loader,
        styles[variant],
        styles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label={label}
    >
      {SEGMENTS.map((segment, index) => {
        if (segment.type === "gap") {
          return <span key={`gap-${index}`} className={styles.gap} aria-hidden />;
        }

        const currentIndex = letterIndex;
        letterIndex += 1;

        return (
          <span
            key={`${segment.char}-${index}`}
            className={[
              styles.letter,
              segment.accent ? styles.aiLetter : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--i": currentIndex } as CSSProperties}
            aria-hidden
          >
            {segment.char}
          </span>
        );
      })}
    </span>
  );
}
