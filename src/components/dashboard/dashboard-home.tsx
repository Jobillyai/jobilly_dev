import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDisplayName } from "@/lib/format-display-name";
import styles from "./dashboard-home.module.css";

type DashboardHomeProps = {
  userName?: string;
  applicationCount: number;
  unreadApplicationCount: number;
  latestApplicationLabel: string | null;
  nextSessionLabel: string;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function DashboardHome({
  userName,
  applicationCount,
  unreadApplicationCount,
  latestApplicationLabel,
  nextSessionLabel,
}: DashboardHomeProps) {
  const greeting = getGreeting();
  const displayName = userName ? formatDisplayName(userName) : null;

  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <p className={styles.greeting}>{greeting}</p>
        <h1 className={styles.title}>
          {displayName ? `Welcome back, ${displayName}` : "Welcome back"}
        </h1>
        <p className={styles.subtitle}>
          Track applications and stay on top of advisory sessions.
        </p>
      </header>

      {unreadApplicationCount > 0 && latestApplicationLabel ? (
        <Link href="/dashboard/applications" className={styles.updateBanner}>
          <span className={styles.updateBannerLabel}>New application update</span>
          <span className={styles.updateBannerText}>{latestApplicationLabel}</span>
          <span className={styles.updateBannerAction}>
            View details <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
      ) : null}

      <section className={styles.stats} aria-label="Overview">
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Applications</p>
          <p className={styles.statValue}>{applicationCount}</p>
          <p className={styles.statHint}>Roles applied on your behalf</p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Next session</p>
          <p className={`${styles.statValue} ${styles.statValueText}`}>
            {nextSessionLabel}
          </p>
          <p className={styles.statHint}>Career advisory calendar</p>
        </article>
      </section>
    </div>
  );
}
