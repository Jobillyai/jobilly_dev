import styles from "@/components/auth/auth-page.module.css";

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        <div className={styles.card}>{children}</div>
      </div>
    </div>
  );
}
