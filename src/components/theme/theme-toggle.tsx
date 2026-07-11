"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import styles from "./theme-toggle.module.css";

type ThemeToggleProps = {
  compact?: boolean;
  className?: string;
};

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const iconSize = compact ? 13 : 14;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      className={[
        styles.track,
        compact ? styles.trackCompact : "",
        isDark ? styles.trackDark : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span className={styles.icons} aria-hidden>
        <Sun
          size={iconSize}
          className={`${styles.icon} ${!isDark ? styles.iconActive : ""}`}
        />
        <Moon
          size={iconSize}
          className={`${styles.icon} ${isDark ? styles.iconActive : ""}`}
        />
      </span>
      <span
        className={`${styles.thumb} ${isDark ? styles.thumbDark : ""}`}
        aria-hidden
      />
    </button>
  );
}
