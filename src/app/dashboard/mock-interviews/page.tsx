export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock3, Sparkles, TrendingUp } from "lucide-react";
import {
  formatPlanPriceMonthly,
  getPremiumPlan,
} from "@/lib/candidate-services";
import { getSessionUser } from "@/lib/auth/session";
import {
  entitlementsForPlan,
  getCandidateSubscription,
} from "@/server/services/candidate-subscriptions";
import dashboardStyles from "../dashboard.module.css";
import styles from "./mock-interviews.module.css";

const performanceScores = [
  { label: "Communication", score: 86, color: "#5170ff" },
  { label: "Problem solving", score: 78, color: "#38b6ff" },
  { label: "Technical depth", score: 72, color: "#7c5cff" },
];

const previewSessions = [
  {
    role: "Frontend Developer",
    type: "Technical",
    date: "Jul 12, 2026",
    duration: "42 min",
    score: 82,
    status: "Strong",
  },
  {
    role: "Software Engineer",
    type: "Behavioral",
    date: "Jul 6, 2026",
    duration: "35 min",
    score: 78,
    status: "On track",
  },
  {
    role: "React Developer",
    type: "Technical",
    date: "Jun 28, 2026",
    duration: "40 min",
    score: 74,
    status: "On track",
  },
];

function ScoreDonut({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <article className={styles.scoreCard}>
      <svg
        className={styles.donut}
        viewBox="0 0 128 128"
        role="img"
        aria-label={`${label}: ${score} out of 100`}
      >
        <circle className={styles.donutTrack} cx="64" cy="64" r="52" pathLength="100" />
        <circle
          className={styles.donutValue}
          cx="64"
          cy="64"
          r="52"
          pathLength="100"
          stroke={color}
          strokeDasharray={`${score} ${100 - score}`}
        />
        <text x="64" y="61" textAnchor="middle" className={styles.donutScore}>
          {score}
        </text>
        <text x="64" y="78" textAnchor="middle" className={styles.donutUnit}>
          / 100
        </text>
      </svg>
      <div>
        <h3 className={styles.scoreLabel}>{label}</h3>
        <p className={styles.scoreHint}>
          {score >= 85 ? "Your strongest area" : score >= 75 ? "Building steadily" : "Focus area"}
        </p>
      </div>
    </article>
  );
}

export default async function MockInterviewsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const subscription = await getCandidateSubscription(user.id);
  const hasMockInterviews = entitlementsForPlan(subscription?.plan).hasMockInterviews;
  const mockPlan = getPremiumPlan("mock-interviews")!;
  const fullPlan = getPremiumPlan("mock-and-job")!;

  return (
    <div className={dashboardStyles.page}>
      <main className={dashboardStyles.main}>
        <header className={dashboardStyles.topBar}>
          <div>
            <p className={dashboardStyles.eyebrow}>Student portal</p>
            <h1 className={dashboardStyles.title}>Mock interview performance</h1>
            <p className={dashboardStyles.subtitle}>
              Review your practice history, track score trends, and see which interview
              skills need the most attention.
            </p>
          </div>
          {hasMockInterviews ? (
            <div className={styles.headerActions}>
              <span className={styles.previewBadge}>Dashboard preview</span>
              <Link
                href="/dashboard/mock-interviews/new"
                className={styles.startButton}
              >
                Start a new interview
                <span>Preview</span>
              </Link>
            </div>
          ) : null}
        </header>

        {!hasMockInterviews ? (
          <section className={styles.lockedCard}>
            <div className={styles.lockedIcon} aria-hidden>
              <Sparkles size={24} />
            </div>
            <p className={styles.lockedEyebrow}>Mock Interview dashboard</p>
            <h2 className={styles.lockedTitle}>Unlock interview performance insights</h2>
            <p className={styles.lockedText}>
              Choose Mock Interviews or the Full Bundle to access practice-session history,
              competency scores, and personalized improvement areas.
            </p>
            <div className={styles.upgradeActions}>
              <Link
                href="/dashboard/plans?plan=mock-interviews"
                className={styles.primaryButton}
              >
                Mock Interviews — {formatPlanPriceMonthly(mockPlan.priceUsd)}
              </Link>
              <Link
                href="/dashboard/plans?plan=mock-and-job"
                className={styles.secondaryButton}
              >
                Full Bundle — {formatPlanPriceMonthly(fullPlan.priceUsd)}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className={styles.notice}>
              <Sparkles size={18} aria-hidden />
              <p>
                Mock interview booking is coming soon. The information below is illustrative
                preview data showing how completed sessions will appear.
              </p>
            </section>

            <section className={styles.summaryGrid} aria-label="Performance summary">
              <article className={styles.summaryCard}>
                <span className={styles.summaryIcon}><CalendarDays size={20} /></span>
                <div><strong>3</strong><span>Completed mocks</span></div>
              </article>
              <article className={styles.summaryCard}>
                <span className={styles.summaryIcon}><TrendingUp size={20} /></span>
                <div><strong>78</strong><span>Average score</span></div>
              </article>
              <article className={styles.summaryCard}>
                <span className={styles.summaryIcon}><Sparkles size={20} /></span>
                <div><strong>+8</strong><span>Score improvement</span></div>
              </article>
              <article className={styles.summaryCard}>
                <span className={styles.summaryIcon}><Clock3 size={20} /></span>
                <div><strong>117m</strong><span>Total practice</span></div>
              </article>
            </section>

            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Competency breakdown</p>
                  <h2>Performance by skill</h2>
                </div>
                <span>Latest 3 sessions</span>
              </div>
              <div className={styles.scoreGrid}>
                {performanceScores.map((metric) => (
                  <ScoreDonut key={metric.label} {...metric} />
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionEyebrow}>Practice history</p>
                  <h2>Previous mock interviews</h2>
                </div>
              </div>
              <div className={styles.sessionList}>
                {previewSessions.map((session) => (
                  <article key={`${session.role}-${session.date}`} className={styles.sessionRow}>
                    <div className={styles.sessionRole}>
                      <span className={styles.sessionMark}>{session.role.charAt(0)}</span>
                      <div>
                        <h3>{session.role}</h3>
                        <p>{session.type} interview</p>
                      </div>
                    </div>
                    <div className={styles.sessionMeta}>
                      <span>{session.date}</span>
                      <span>{session.duration}</span>
                    </div>
                    <div className={styles.sessionResult}>
                      <strong>{session.score}</strong>
                      <span>{session.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
