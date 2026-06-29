import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Compass,
  FileText,
  UserCircle,
} from "lucide-react";
import { formatDisplayName } from "@/lib/format-display-name";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import styles from "./dashboard-home.module.css";

type DashboardHomeProps = {
  userName?: string;
  memberId?: string | null;
  applicationCount: number;
  unreadApplicationCount: number;
  latestApplicationLabel: string | null;
  latestAtsScore: number | null;
  nextSessionLabel: string;
};

const modules = [
  {
    href: "/dashboard/career-advisory",
    title: "Career Advisory",
    description: "Share your goals and book a session with our career team.",
    icon: Compass,
  },
  {
    href: "/dashboard/ats-resume-score",
    title: "ATS Resume Score",
    description: "Upload your resume and get an ATS compatibility score.",
    icon: FileText,
  },
  {
    href: "/dashboard/applications",
    title: "Applications",
    description: "Track roles your Jobilly team has applied to on your behalf.",
    icon: Briefcase,
  },
  {
    href: "/dashboard/calendar",
    title: "Calendar",
    description: "View upcoming advisory sessions and past appointments.",
    icon: Calendar,
  },
  {
    href: "/dashboard/profile",
    title: "Profile",
    description: "Update your contact details and resume.",
    icon: UserCircle,
  },
] as const;

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
  memberId,
  applicationCount,
  unreadApplicationCount,
  latestApplicationLabel,
  latestAtsScore,
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
        {memberId ? (
          <p className={styles.memberIdRow}>
            Signed in as <MemberIdBadge memberId={memberId} />
          </p>
        ) : null}
        <p className={styles.subtitle}>
          Your career workspace — track applications, improve your resume, and stay
          on top of advisory sessions.
        </p>
      </header>

      {unreadApplicationCount > 0 && latestApplicationLabel ? (
        <Link href="/dashboard/applications" className={styles.updateBanner}>
          <span className={styles.updateBannerLabel}>New application update</span>
          <span className={styles.updateBannerText}>{latestApplicationLabel}</span>
          <span className={styles.updateBannerAction}>
            View JD &amp; prep tips <ArrowRight size={14} aria-hidden />
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
          <p className={styles.statLabel}>Latest ATS score</p>
          <p
            className={`${styles.statValue} ${
              latestAtsScore !== null ? styles.statValueAccent : ""
            }`}
          >
            {latestAtsScore !== null ? latestAtsScore : "—"}
          </p>
          <p className={styles.statHint}>
            {latestAtsScore !== null ? "From your most recent check" : "Run a resume check"}
          </p>
        </article>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Next session</p>
          <p className={`${styles.statValue} ${styles.statValueText}`}>
            {nextSessionLabel}
          </p>
          <p className={styles.statHint}>Career advisory calendar</p>
        </article>
      </section>

      <h2 className={styles.sectionTitle}>Quick actions</h2>
      <div className={styles.grid}>
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardTitle}>{item.title}</p>
                  <p className={styles.cardDesc}>{item.description}</p>
                </div>
                <span className={styles.cardIcon} aria-hidden>
                  <Icon size={20} strokeWidth={2} />
                </span>
              </div>
              <span className={styles.cardAction}>
                Open <ArrowRight size={14} aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
