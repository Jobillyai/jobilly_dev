import styles from "./page-loader.module.css";

export function PageLoader() {
  return (
    <div className={styles.pageLoader} aria-live="polite" aria-busy="true">
      <div className={styles.pageLoaderSpinner} aria-hidden />
      <p className={styles.pageLoaderText}>Loading…</p>
    </div>
  );
}
