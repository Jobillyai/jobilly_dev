import Link from "next/link";
import styles from "@/components/auth/auth-page.module.css";

export default function ConfirmEmailPage() {
  return (
    <>
      <div className={styles.header}>
        <div className={styles.confirmIcon} aria-hidden>
          &#x2709;
        </div>
        <h1 className={styles.title}>
          Check your <em className={styles.titleEm}>email</em>
        </h1>
        <p className={styles.subtitle}>
          We sent a confirmation link to the address you signed up with. Click
          it to activate your account, then come back and log in.
        </p>
      </div>

      <p className={styles.footer}>
        <Link href="/login" className={styles.footerLink}>
          Back to log in
        </Link>
      </p>
    </>
  );
}
