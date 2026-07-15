import type { ReactNode } from "react";
import styles from "@/app/admin/admin.module.css";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
};

export function AdminPageHeader({ eyebrow, title, subtitle }: AdminPageHeaderProps) {
  return (
    <div className={styles.pageHeaderBlock}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>{eyebrow}</p>
          <h1 className={styles.pageTitle}>{title}</h1>
          {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
        </div>
      </header>
    </div>
  );
}
