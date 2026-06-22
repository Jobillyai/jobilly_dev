import { JobillyLoader } from "./jobilly-loader";
import styles from "./page-loader.module.css";

export function PageLoader() {
  return (
    <div className={styles.pageLoader} aria-live="polite" aria-busy="true">
      <JobillyLoader variant="default" size="lg" />
    </div>
  );
}
