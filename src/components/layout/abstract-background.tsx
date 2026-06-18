import styles from "./abstract-background.module.css";

type AbstractBackgroundProps = {
  className?: string;
};

export function AbstractBackground({ className }: AbstractBackgroundProps) {
  return (
    <div className={`${styles.background} ${className ?? ""}`.trim()} aria-hidden>
      <div className={styles.grid} />
      <div className={styles.dotField} />
      <div className={`${styles.orb} ${styles.orbTop}`} />
      <div className={`${styles.orb} ${styles.orbBottom}`} />
      <div className={`${styles.orb} ${styles.orbMid}`} />
      <div className={styles.abstractBlob} />
      <div className={`${styles.abstractBlob} ${styles.abstractBlobAlt}`} />

      <svg className={styles.abstractSvg} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <circle cx="180" cy="620" r="120" fill="none" stroke="rgba(24,119,242,0.08)" strokeWidth="2" />
        <circle cx="180" cy="620" r="180" fill="none" stroke="rgba(24,119,242,0.05)" strokeWidth="1.5" strokeDasharray="6 10" />
        <circle cx="1020" cy="180" r="90" fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth="2" />
        <circle cx="1020" cy="180" r="150" fill="none" stroke="rgba(124,58,237,0.05)" strokeWidth="1.5" strokeDasharray="5 9" />
        <path
          d="M0 520 Q320 380, 600 460 T1200 340"
          fill="none"
          stroke="rgba(74,159,255,0.12)"
          strokeWidth="2"
          strokeDasharray="10 14"
        />
        <path
          d="M80 120 Q420 260, 720 180 T1200 260"
          fill="none"
          stroke="rgba(24,119,242,0.1)"
          strokeWidth="1.5"
          strokeDasharray="8 12"
        />
        <ellipse cx="600" cy="400" rx="280" ry="120" fill="none" stroke="rgba(24,119,242,0.04)" strokeWidth="1" />
      </svg>

      <div className={styles.ringCluster}>
        <span className={styles.ring} />
        <span className={`${styles.ring} ${styles.ringSm}`} />
      </div>

      <div className={styles.glowLine} />
      <div className={`${styles.glowLine} ${styles.glowLineAlt}`} />

      <div className={styles.sparkCluster}>
        <span className={styles.spark} />
        <span className={`${styles.spark} ${styles.sparkMid}`} />
        <span className={`${styles.spark} ${styles.sparkSmall}`} />
      </div>
    </div>
  );
}
