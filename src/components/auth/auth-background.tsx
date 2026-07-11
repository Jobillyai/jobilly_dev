import Link from "next/link";
import { JobillyMark } from "@/components/brand/jobilly-mark";
import { PageWaveBackground } from "@/components/layout/page-wave-background";
import styles from "./auth-background.module.css";

export function AuthBackground() {
  return (
    <div className={styles.backdrop}>
      <PageWaveBackground direction="tl-br" lineCount={52} />

      <div className={styles.featureBrand}>
        <Link href="/" className={styles.featureLogo}>
          <JobillyMark size={112} className={styles.featureMark} />
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
