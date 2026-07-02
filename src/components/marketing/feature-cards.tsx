import Link from "next/link";
import type { ReactNode } from "react";
import {
  candidateServices,
  formatPlanPriceMonthly,
  type CandidateService,
} from "@/lib/candidate-services";
import styles from "./welcome-page.module.css";

type FeatureCardsProps = {
  developmentInProgress?: boolean;
  enableFeatureLinks?: boolean;
};

const iconMeta: Record<
  string,
  { iconClass?: string; badgeClass?: string; slug: string | null; icon: ReactNode }
> = {
  "career-advisory": {
    slug: "career-advisory",
    iconClass: styles.fiBlue,
    badgeClass: styles.badgeFree,
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
  profile: {
    slug: "profile",
    iconClass: styles.fiBlue,
    badgeClass: styles.badgeFree,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <circle cx="14" cy="10" r="4.5" stroke="#1877F2" strokeWidth="2" />
        <path
          d="M7 23C7 18.582 10.134 15 14 15C17.866 15 21 18.582 21 23"
          stroke="#1877F2"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  calendar: {
    slug: "calendar",
    iconClass: styles.fiBlue,
    badgeClass: styles.badgeFree,
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
  "growth-school": {
    slug: null,
    iconClass: styles.fiGreen,
    badgeClass: styles.badgeSoon,
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
  "mock-interviews": {
    slug: null,
    iconClass: styles.fiViolet,
    badgeClass: styles.badgePremium,
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
  applications: {
    slug: null,
    iconClass: styles.fiOrange,
    badgeClass: styles.badgePremium,
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
        <path d="M19.5 7H22.5M21 5.5V8.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
};

function getBadgeLabel(service: CandidateService, developmentInProgress: boolean) {
  if (developmentInProgress) {
    return "Development in Progress";
  }
  if (service.tier === "premium" && service.priceUsd !== undefined) {
    return formatPlanPriceMonthly(service.priceUsd);
  }
  if (service.status === "coming_soon") {
    return "Coming soon";
  }
  return "Free";
}

function getBadgeClass(service: CandidateService, developmentInProgress: boolean) {
  if (developmentInProgress) {
    return styles.badgeDev;
  }
  const meta = iconMeta[service.id];
  if (service.status === "coming_soon") {
    return styles.badgeSoon;
  }
  return meta?.badgeClass ?? styles.badgeFree;
}

export function FeatureCards({
  developmentInProgress = false,
  enableFeatureLinks = false,
}: FeatureCardsProps) {
  return (
    <div className={styles.featuresGrid}>
      {candidateServices.map((service) => {
        const meta = iconMeta[service.id];
        if (!meta) {
          return null;
        }

        const href =
          enableFeatureLinks && meta.slug
            ? (`/dashboard/${meta.slug}` as "/dashboard/career-advisory" | "/dashboard/profile" | "/dashboard/calendar")
            : undefined;

        const card = (
          <>
            <div className={`${styles.featureIconWrap} ${meta.iconClass}`}>{meta.icon}</div>
            <div className={`${styles.featureBadge} ${getBadgeClass(service, developmentInProgress)}`}>
              {getBadgeLabel(service, developmentInProgress)}
            </div>
            <div className={styles.featureTitle}>{service.title}</div>
            <div className={styles.featureDesc}>{service.description}</div>
            <ul className={styles.featureHighlights}>
              {service.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        );

        if (href) {
          return (
            <Link
              key={service.id}
              href={href}
              className={`${styles.featureCard} ${styles.featureCardLink}`}
            >
              {card}
            </Link>
          );
        }

        return (
          <div key={service.id} className={styles.featureCard}>
            {card}
          </div>
        );
      })}
    </div>
  );
}
