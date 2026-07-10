import type { ReactNode } from "react";
import styles from "@/app/admin/admin.module.css";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
};

export function AdminPageHeader({ eyebrow, title, subtitle }: AdminPageHeaderProps) {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.pageEyebrow}>{eyebrow}</p>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
      </div>
      <time className={styles.pageDate} dateTime={new Date().toISOString().slice(0, 10)}>
        {dateLabel}
      </time>
    </header>
  );
}
