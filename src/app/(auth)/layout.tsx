import { AuthBackground } from "@/components/auth/auth-background";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import styles from "@/components/auth/auth-page.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <AuthBackground />
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.mobileBrand}>
            <JobillyLogo href="/" markSize={40} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
