import Image from "next/image";
import styles from "./joben-avatar.module.css";

type JobenAvatarProps = {
  size?: "sm" | "md" | "lg" | "xl" | "launcher";
  showOnline?: boolean;
  className?: string;
};

const SIZE_PX = {
  sm: 34,
  md: 48,
  lg: 64,
  xl: 80,
  launcher: 64,
} as const;

export function JobenAvatar({
  size = "md",
  showOnline = false,
  className,
}: JobenAvatarProps) {
  const px = SIZE_PX[size];
  const rootClass = [styles.root, styles[size], className].filter(Boolean).join(" ");

  return (
    <span className={rootClass}>
      <Image
        src="/brand/joben-avatar.png"
        alt=""
        width={px}
        height={px}
        className={styles.image}
        aria-hidden
        priority={size === "launcher" || size === "xl"}
      />
      {showOnline ? (
        <span className={styles.onlineDot} aria-label="Online">
          <span className={styles.onlinePulse} aria-hidden />
        </span>
      ) : null}
    </span>
  );
}
