import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Compass,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { formatDisplayName } from "@/lib/format-display-name";
import {
  getPremiumPlan,
  type PremiumPlanId,
} from "@/lib/candidate-services";
import styles from "./dashboard-home.module.css";

const workspaceLinks = [
  {
    href: "/dashboard/applications" as const,
    label: "Applications",
    description: "Applied roles, application resumes, and prep tips.",
    icon: Briefcase,
    tone: "blue" as const,
  },
  {
    href: "/dashboard/career-advisory" as const,
    label: "Career advisory",
    description: "Book a free session and share your goals.",
    icon: Compass,
    tone: "purple" as const,
  },
  {
    href: "/dashboard/calendar" as const,
    label: "Calendar",
    description: "Upcoming advisory sessions.",
    icon: Calendar,
    tone: "emerald" as const,
  },
  {
    href: "/dashboard/profile" as const,
    label: "Profile",
    description: "Resume, education, and preferences.",
    icon: UserCircle,
    tone: "amber" as const,
  },
] as const;

type DashboardHomeProps = {
  userName?: string;
  currentPlanId: PremiumPlanId | null;
  applicationCount: number;
  unreadApplicationCount: number;
  latestApplicationLabel: string | null;
  nextSessionLabel: string;
};

function ProgressRing({ count }: { count: number }) {
  const pct = Math.min(100, count * 10);
  const radius = 52;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className={styles.progressRing} aria-hidden>
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={stroke}
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className={styles.progressCenter}>
        <span className={styles.progressValue}>{count}</span>
        <span className={styles.progressLabel}>roles</span>
      </div>
    </div>
  );
}

export function DashboardHome({
  userName,
  currentPlanId,
  applicationCount,
  unreadApplicationCount,
  latestApplicationLabel,
  nextSessionLabel,
}: DashboardHomeProps) {
  const displayName = userName ? formatDisplayName(userName) : "there";
  const currentPlan = currentPlanId ? getPremiumPlan(currentPlanId) : null;
  const needsApplicationUpgrade =
    !currentPlanId || currentPlanId === "mock-interviews";

  return (
    <div className={styles.home}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.eyebrow}>Student portal</p>
          <h1 className={styles.title}>Hello, {displayName}</h1>
        </div>
      </header>

      <div className={styles.planBanner}>
        <div>
          <strong>
            {currentPlan ? `${currentPlan.shortLabel} plan active` : "Free tier — no paid plan"}
          </strong>
          <span>
            {currentPlan
              ? needsApplicationUpgrade
                ? " Upgrade to the Full Bundle to add managed job applications."
                : " Your paid services are available in this portal."
              : " Career Advisory and core candidate tools are included. Upgrade for mock interviews or managed applications."}
          </span>
        </div>
        {needsApplicationUpgrade ? (
          <Link href="/dashboard/plans" className={styles.planUpgrade}>
            View upgrades
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : (
          <Link href="/dashboard/plans" className={styles.planUpgrade}>
            View plan
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>

      <section className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>
            <Sparkles size={14} aria-hidden />
            Career workspace
          </span>
          <h2 className={styles.heroTitle}>Your application hub</h2>
          <p className={styles.heroCopy}>
            Track every role our team applies to on your behalf, plus advisory
            sessions and profile updates — all in one place.
          </p>
          {unreadApplicationCount > 0 && latestApplicationLabel ? (
            <Link href="/dashboard/applications" className={styles.heroCta}>
              View new update
              <ArrowRight size={16} aria-hidden />
            </Link>
          ) : (
            <Link href="/dashboard/career-advisory" className={styles.heroCta}>
              Book advisory
              <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </div>
        <ProgressRing count={applicationCount} />
      </section>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`} aria-hidden>
            <Briefcase size={20} />
          </span>
          <div>
            <p className={styles.statValue}>{applicationCount}</p>
            <p className={styles.statLabel}>Applications</p>
          </div>
        </article>
        <article className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconPurple}`} aria-hidden>
            <Calendar size={20} />
          </span>
          <div>
            <p className={`${styles.statValue} ${styles.statValueSm}`}>{nextSessionLabel}</p>
            <p className={styles.statLabel}>Next session</p>
          </div>
        </article>
        <article className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconEmerald}`} aria-hidden>
            <Sparkles size={20} />
          </span>
          <div>
            <p className={styles.statValue}>{unreadApplicationCount}</p>
            <p className={styles.statLabel}>New updates</p>
          </div>
        </article>
      </div>

      {unreadApplicationCount > 0 && latestApplicationLabel ? (
        <div className={styles.alertBanner}>
          <p>
            New update on <strong>{latestApplicationLabel}</strong> — open Applications
            for the job description, application resume, and prep tips.
          </p>
          <Link href="/dashboard/applications" className={styles.alertLink}>
            Open
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      ) : null}

      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick access</h2>
          <span className={styles.sectionMeta}>{workspaceLinks.length} areas</span>
        </div>
        <div className={styles.cardGrid}>
          {workspaceLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={styles.workspaceCard}>
                <span className={`${styles.cardIcon} ${styles[`cardIcon_${item.tone}`]}`}>
                  <Icon size={22} strokeWidth={2} />
                </span>
                <h3 className={styles.cardTitle}>{item.label}</h3>
                <p className={styles.cardDesc}>{item.description}</p>
                <span className={styles.cardLink}>
                  Open
                  <ArrowRight size={14} aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
