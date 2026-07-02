import Link from "next/link";
import styles from "./jobilly-logo.module.css";

type JobillyLogoProps = {
  href?: string;
  height?: number;
  showWordmark?: boolean;
  onDark?: boolean;
  className?: string;
  wordmarkClassName?: string;
};

export function JobillyLogo({
  href = "/",
  height = 36,
  showWordmark = true,
  onDark = false,
  className,
  wordmarkClassName,
}: JobillyLogoProps) {
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/jobilly.png"
        alt="Jobilly AI"
        className={styles.mark}
        style={{ height }}
        width={Math.round(height * 2.09)}
        height={height}
      />
      {showWordmark ? (
        <span
          className={`${styles.wordmark} ${onDark ? styles.wordmarkOnDark : ""} ${wordmarkClassName ?? ""}`}
        >
          jobilly<span className={onDark ? styles.wordmarkDarkOnDark : styles.wordmarkDark}>.ai</span>
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
