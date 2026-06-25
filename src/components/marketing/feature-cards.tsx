import Link from "next/link";
import { formatPlanPriceMonthly } from "@/lib/candidate-services";
import styles from "./welcome-page.module.css";

type FeatureCardsProps = {
  developmentInProgress?: boolean;
  enableFeatureLinks?: boolean;
};

const features = [
  {
    slug: "career-advisory",
    iconClass: styles.fiBlue,
    badgeClass: styles.badgeFree,
    badge: "Free",
    title: "Career Advisory",
    description:
      "One-on-one sessions with expert mentors. Tell us your background and goals — we map out exactly which skills and technologies to focus on first.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path
          d="M14 4C8.477 4 4 8.477 4 14C4 19.523 8.477 24 14 24C19.523 24 24 19.523 24 14"
          stroke="#1877F2"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="14" cy="14" r="3" fill="#1877F2" />
        <path
          d="M20 4L24 4L24 8"
          stroke="#1877F2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M24 4L18 10" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: "ats-resume-score",
    iconClass: styles.fiGreen,
    badgeClass: styles.badgeFree,
    badge: "Free",
    title: "ATS Resume Score",
    description:
      "Upload your resume as PDF or Word and get a 0–100 ATS score with missing keywords and improvement tips powered by Apify.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path
          d="M8 6H20C21.105 6 22 6.895 22 8V20C22 21.105 21.105 22 20 22H8C6.895 22 6 21.105 6 20V8C6 6.895 6.895 6 8 6Z"
          stroke="#059669"
          strokeWidth="2"
        />
        <path d="M10 11H18M10 15H16" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="7" r="4" fill="#059669" />
        <path
          d="M20 7H22M21 6V8"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    slug: "calendar",
    iconClass: styles.fiBlue,
    badgeClass: styles.badgeFree,
    badge: "Free",
    title: "My Calendar",
    description:
      "See your booked career advisory sessions on a calendar and join Google Meet when it's time.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect x="4" y="6" width="20" height="18" rx="3" stroke="#1877F2" strokeWidth="2" />
        <path d="M4 11H24" stroke="#1877F2" strokeWidth="2" />
        <path d="M10 4V8M18 4V8" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" />
        <rect x="9" y="14" width="4" height="4" rx="1" fill="#1877F2" />
        <rect x="15" y="14" width="4" height="4" rx="1" fill="#4A9FFF" />
      </svg>
    ),
  },
  {
    slug: null,
    iconClass: styles.fiGreen,
    badgeClass: styles.badgeFree,
    badge: "Free",
    title: "Growth School",
    description:
      "AI-generated micro-lessons, intelligent quizzes, and real-world coding challenges modelled on how Meta, Google, and Amazon use these skills in production.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect x="4" y="6" width="20" height="16" rx="3" stroke="#059669" strokeWidth="2" />
        <path d="M9 12H19M9 16H15" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 2V6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="21" r="4" fill="#059669" />
        <path
          d="M19.5 21L20.5 22L22.5 20"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    slug: null,
    iconClass: styles.fiViolet,
    badgeClass: styles.badgePremium,
    badge: formatPlanPriceMonthly(79.99),
    title: "Mock Interviews",
    description:
      "Voice AI interviews with real company personas — Meta, Google, Amazon, Apple. Practice until behavioral and technical rounds feel natural.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <rect x="4" y="8" width="20" height="14" rx="3" stroke="#7C3AED" strokeWidth="2" />
        <path
          d="M9 15C9 15 11 17 14 17C17 17 19 15 19 15"
          stroke="#7C3AED"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="10.5" cy="12.5" r="1.5" fill="#7C3AED" />
        <circle cx="17.5" cy="12.5" r="1.5" fill="#7C3AED" />
        <path d="M19 5L22 8M9 5L6 8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 5V8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: null,
    iconClass: styles.fiOrange,
    badgeClass: styles.badgePremium,
    badge: formatPlanPriceMonthly(99.99),
    title: "Job Applications",
    description:
      "Subscribe and let us handle it. Our team applies to matched roles, tailors your resume for each one, and keeps you updated — while you focus entirely on learning.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <path
          d="M20 6H8C6.895 6 6 6.895 6 8V20C6 21.105 6.895 22 8 22H20C21.105 22 22 21.105 22 20V8C22 6.895 21.105 6 20 6Z"
          stroke="#F97316"
          strokeWidth="2"
        />
        <path d="M10 12H18M10 16H15" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 3V7M11 3V7" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="7" r="4" fill="#F97316" />
        <path
          d="M19.5 7H22.5M21 5.5V8.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

export function FeatureCards({
  developmentInProgress = false,
  enableFeatureLinks = false,
}: FeatureCardsProps) {
  return (
    <div className={styles.featuresGrid}>
      {features.map((feature) => {
        const href =
          enableFeatureLinks && feature.slug
            ? (`/dashboard/${feature.slug}` as const)
            : undefined;

        const card = (
          <>
            <div className={`${styles.featureIconWrap} ${feature.iconClass}`}>
              {feature.icon}
            </div>
            <div
              className={`${styles.featureBadge} ${
                developmentInProgress ? styles.badgeDev : feature.badgeClass
              }`}
            >
              {developmentInProgress ? "Development in Progress" : feature.badge}
            </div>
            <div className={styles.featureTitle}>{feature.title}</div>
            <div className={styles.featureDesc}>{feature.description}</div>
          </>
        );

        if (href) {
          return (
            <Link
              key={feature.title}
              href={href}
              className={`${styles.featureCard} ${styles.featureCardLink}`}
            >
              {card}
            </Link>
          );
        }

        return (
          <div key={feature.title} className={styles.featureCard}>
            {card}
          </div>
        );
      })}
    </div>
  );
}
