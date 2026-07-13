import { PageWaveBackground } from "@/components/layout/page-wave-background";
import styles from "./portal-background.module.css";

export function PortalBackground() {
  return (
    <PageWaveBackground
      className={styles.wave}
      direction="tl-br"
      lineCount={52}
    />
  );
}
