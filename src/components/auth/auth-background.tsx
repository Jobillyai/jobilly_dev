import Link from "next/link";
import { PageWaveBackground } from "@/components/layout/page-wave-background";
import styles from "./auth-background.module.css";

export function AuthBackground() {
  return (
    <div className={styles.backdrop}>
      <PageWaveBackground direction="tl-br" lineCount={52} />

      <div className={styles.featureBrand}>
        <Link href="/" className={styles.featureLogo} aria-label="Jobilly.ai home">
          {/* eslint-disable-next-line @next/next/no-img-element -- local brand PNG lockup */}
          <img
            src="/brand/jobilly-logo-arrow-name.png"
            alt=""
            className={styles.featureLockup}
            draggable={false}
            aria-hidden
          />
          <span className={styles.featureSubtitle}>From graduation to first job</span>
        </Link>
        <p className={styles.featureCopy}>
          Career advisory, AI learning, mock interviews, and managed applications — all in one
          place.
        </p>
      </div>
    </div>
  );
}
