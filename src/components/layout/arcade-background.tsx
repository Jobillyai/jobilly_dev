import styles from "./arcade-background.module.css";

type ArcadeBackgroundProps = {
  className?: string;
};

/** Arcade Enterprise–inspired soft mesh, dots, and arc decoration. */
export function ArcadeBackground({ className }: ArcadeBackgroundProps) {
  return (
    <div className={`${styles.root} ${className ?? ""}`.trim()} aria-hidden>
      <div className={styles.mesh} />
      <div className={styles.dots} />
      <div className={`${styles.orb} ${styles.orbOne}`} />
      <div className={`${styles.orb} ${styles.orbTwo}`} />
      <div className={`${styles.orb} ${styles.orbThree}`} />

      <svg className={styles.arcs} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <circle
          cx="200"
          cy="680"
          r="140"
          fill="none"
          stroke="rgba(124, 58, 237, 0.2)"
          strokeWidth="1.5"
        />
        <circle
          cx="200"
          cy="680"
          r="210"
          fill="none"
          stroke="rgba(124, 58, 237, 0.12)"
          strokeWidth="1"
          strokeDasharray="6 10"
        />
        <circle
          cx="1240"
          cy="160"
          r="100"
          fill="none"
          stroke="rgba(99, 102, 241, 0.2)"
          strokeWidth="1.5"
        />
        <circle
          cx="1240"
          cy="160"
          r="170"
          fill="none"
          stroke="rgba(99, 102, 241, 0.12)"
          strokeWidth="1"
          strokeDasharray="5 9"
        />
        <path
          d="M0 560 Q360 420, 720 500 T1440 380"
          fill="none"
          stroke="rgba(124, 58, 237, 0.16)"
          strokeWidth="1.5"
          strokeDasharray="10 14"
        />
        <path
          d="M100 140 Q480 280, 840 200 T1440 280"
          fill="none"
          stroke="rgba(99, 102, 241, 0.14)"
          strokeWidth="1.25"
          strokeDasharray="8 12"
        />
      </svg>
    </div>
  );
}
