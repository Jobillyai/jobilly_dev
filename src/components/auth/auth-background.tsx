import Link from "next/link";
import { JobillyMark } from "@/components/brand/jobilly-mark";
import styles from "./auth-background.module.css";

const patternMarks = Array.from({ length: 18 }, (_, index) => index);

export function AuthBackground() {
  return (
    <div className={styles.backdrop}>
      <div className={styles.decorLayer} aria-hidden>
        <div className={styles.baseGradient} />

        <div className={styles.patternField}>
          {patternMarks.map((index) => (
            <JobillyMark
              key={index}
              size={56}
              gradientId={`authPattern${index}`}
              className={styles.patternMark}
            />
          ))}
        </div>
      </div>

      <div className={styles.featureBrand}>
        <Link href="/" className={styles.featureLogo}>
          <JobillyMark size={112} gradientId="authFeatureMark" className={styles.featureMark} />
          <span className={styles.featureWordmarkBlock}>
            <span className={styles.featureWordmark}>
              jobilly<span className={styles.featureWordmarkAccent}>.ai</span>
            </span>
            <span className={styles.featureSubtitle}>From graduation to first job</span>
          </span>
        </Link>
        <p className={styles.featureCopy}>
          Career advisory, AI learning, mock interviews, and managed applications — all in one
          place.
        </p>
      </div>
    </div>
  );
}
