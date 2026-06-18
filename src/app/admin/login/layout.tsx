import styles from "@/components/auth/auth-page.module.css";

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.bgCircle1} aria-hidden />
      <div className={styles.bgCircle2} aria-hidden />
      <div className={styles.content}>
        <div className={styles.card}>{children}</div>
      </div>
    </div>
  );
}
