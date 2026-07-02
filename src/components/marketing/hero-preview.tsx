import { Briefcase, Calendar, CheckCircle2, Sparkles } from "lucide-react";
import styles from "./hero-preview.module.css";

export function HeroPreview() {
  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.glow} />

      <div className={`${styles.floatCard} ${styles.floatCardTop}`}>
        <div className={styles.floatIcon}>
          <CheckCircle2 size={16} />
        </div>
        <div>
          <p className={styles.floatTitle}>Application sent</p>
          <p className={styles.floatMeta}>Product Analyst · Google</p>
        </div>
      </div>

      <article className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Your career workspace</h3>
          <span className={styles.cardBadge}>Live</span>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <p className={styles.statLabel}>Applications</p>
            <p className={styles.statValue}>12</p>
          </div>
          <div className={styles.statBox}>
            <p className={styles.statLabel}>Next session</p>
            <p className={styles.statValue}>Thu 4pm</p>
          </div>
        </div>

        <ul className={styles.list}>
          <li className={styles.listItem}>
            <span className={styles.listIcon}>
              <Briefcase size={16} />
            </span>
            <div className={styles.listText}>
              <p className={styles.listTitle}>Software Engineer</p>
              <p className={styles.listMeta}>Applied on your behalf · Meta</p>
            </div>
          </li>
          <li className={styles.listItem}>
            <span className={styles.listIcon}>
              <Calendar size={16} />
            </span>
            <div className={styles.listText}>
              <p className={styles.listTitle}>Career advisory</p>
              <p className={styles.listMeta}>Session booked · Google Meet</p>
            </div>
          </li>
        </ul>
      </article>

      <div className={`${styles.floatCard} ${styles.floatCardBottom}`}>
        <div className={styles.floatIcon}>
          <Sparkles size={16} />
        </div>
        <div>
          <p className={styles.floatTitle}>Mock interview ready</p>
          <p className={styles.floatMeta}>Amazon persona · Behavioral</p>
        </div>
      </div>
    </div>
  );
}
