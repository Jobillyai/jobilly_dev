import { AuthBackground } from "@/components/auth/auth-background";
import styles from "@/components/auth/auth-page.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <AuthBackground />
      <div className={styles.content}>
        <div className={styles.card}>{children}</div>
      </div>
    </div>
  );
}
