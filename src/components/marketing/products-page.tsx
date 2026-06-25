"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  Compass,
  FileText,
  GraduationCap,
  Mic,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { AbstractBackground } from "@/components/layout/abstract-background";
import {
  defaultPremiumPlanId,
  formatPlanPrice,
  formatPlanPriceMonthly,
  freeIncludedServices,
  getServicesByPhase,
  premiumPlans,
  productTrustPoints,
  servicePhases,
  type CandidateService,
  type PremiumPlanId,
  type ServicePhase,
} from "@/lib/candidate-services";
import styles from "./products-page.module.css";

const serviceIcons: Record<string, typeof Compass> = {
  "career-advisory": Compass,
  "ats-resume-score": FileText,
  profile: UserCircle,
  calendar: Calendar,
  "growth-school": GraduationCap,
  "mock-interviews": Mic,
  applications: Briefcase,
};

function StatusBadge({ service }: { service: CandidateService }) {
  if (service.tier === "premium" && service.priceUsd !== undefined) {
    return (
      <span className={styles.badgePremium}>
        {formatPlanPriceMonthly(service.priceUsd)}
      </span>
    );
  }
  if (service.status === "coming_soon") {
    return <span className={styles.badgeSoon}>Coming soon</span>;
  }
  return <span className={styles.badgeLive}>Free</span>;
}

function ServiceCard({ service }: { service: CandidateService }) {
  const Icon = serviceIcons[service.id] ?? Sparkles;
  const isComingSoon = service.status === "coming_soon";

  return (
    <article
      className={`${styles.serviceCard} ${service.featured ? styles.serviceCardFeatured : ""} ${
        isComingSoon ? styles.serviceCardSoon : ""
      }`}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardIconWrap}>
          <Icon size={22} strokeWidth={2} aria-hidden />
        </div>
        <StatusBadge service={service} />
      </div>

      <p className={styles.cardTagline}>{service.tagline}</p>
      <h3 className={styles.cardTitle}>{service.title}</h3>
      <p className={styles.cardDesc}>{service.description}</p>

      <ul className={styles.highlightList}>
        {service.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {service.dashboardHref && !isComingSoon ? (
        <Link href={service.dashboardHref} className={styles.cardLink}>
          Open in portal <ArrowRight size={14} aria-hidden />
        </Link>
      ) : service.tier === "premium" ? (
        <Link href="/signup" className={styles.cardLink}>
          Subscribe <ArrowRight size={14} aria-hidden />
        </Link>
      ) : (
        <span className={styles.cardLinkMuted}>
          {isComingSoon ? "On the roadmap" : "Included with your account"}
        </span>
      )}
    </article>
  );
}

export function ProductsPage() {
  const [activePlanId, setActivePlanId] = useState<PremiumPlanId>(defaultPremiumPlanId);
  const [activePhase, setActivePhase] = useState<ServicePhase | "all">("all");
  const activePlan = premiumPlans.find((plan) => plan.id === activePlanId) ?? premiumPlans[2]!;
  const filtered = getServicesByPhase(activePhase);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <AbstractBackground />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Premium candidate services</p>
          <h1 className={styles.heroTitle}>One plan. Real results.</h1>
          <p className={styles.heroSub}>
            Practice mock interviews, let our team apply to matched roles, or get both —
            while free career tools keep you on track from graduate to hired.
          </p>

          <div className={styles.trustStrip}>
            {productTrustPoints.map((point) => (
              <span key={point} className={styles.trustPill}>
                {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div className={styles.pricingWrap}>
          <div
            className={styles.planToggle}
            role="tablist"
            aria-label="Select a premium plan"
          >
            {premiumPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                role="tab"
                aria-selected={activePlanId === plan.id}
                className={`${styles.planToggleBtn} ${
                  activePlanId === plan.id ? styles.planToggleBtnActive : ""
                }`}
                onClick={() => setActivePlanId(plan.id)}
              >
                {plan.shortLabel}
              </button>
            ))}
          </div>

          <article key={activePlan.id} className={styles.planCard}>
            {activePlan.featured ? (
              <span className={styles.planBadge}>Best value</span>
            ) : null}

            <h2 className={styles.planName}>{activePlan.title}</h2>

            <p className={styles.planPrice}>
              {formatPlanPrice(activePlan.priceUsd)}
              <span className={styles.planPriceSuffix}>/month</span>
            </p>

            <p className={styles.planBillingNote}>
              Monthly subscription · Cancel anytime
            </p>

            {activePlan.savingsLabel ? (
              <p className={styles.planSavings}>{activePlan.savingsLabel}</p>
            ) : (
              <p className={styles.planSavingsMuted}>
                {activePlanId === "mock-interviews"
                  ? "Add Job Applications or choose Full Bundle to save more."
                  : "Choose Full Bundle to save $30/month vs buying separately."}
              </p>
            )}

            <ul className={styles.featureList}>
              {activePlan.includes.map((item) => (
                <li key={item}>
                  <span className={styles.checkIcon} aria-hidden>
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/signup" className={styles.planCta}>
              {activePlan.ctaLabel}
            </Link>
          </article>
        </div>
      </section>

      <section className={styles.detailsSection}>
        <div className={styles.detailsInner}>
          <div className={styles.journeyBlock}>
            <p className={styles.sectionLabel}>The candidate journey</p>
            <h2 className={styles.sectionTitle}>Four phases. One platform.</h2>
            <div className={styles.journeyTrack}>
              {servicePhases.slice(1).map((phase, index) => (
                <div key={phase.id} className={styles.journeyStep}>
                  <div className={styles.journeyNum}>{index + 1}</div>
                  <div>
                    <p className={styles.journeyLabel}>{phase.label}</p>
                    <p className={styles.journeySummary}>{phase.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.catalogBlock}>
            <div className={styles.catalogHeader}>
              <div>
                <p className={styles.sectionLabel}>Service catalog</p>
                <h2 className={styles.sectionTitle}>What you get as a candidate</h2>
              </div>
              <p className={styles.catalogIntro}>
                Every service explained in detail — filter by journey phase or browse all.
                Free tools are included with your account; premium plans unlock mock
                interviews and managed applications.
              </p>
            </div>

            <div
              className={styles.phaseFilters}
              role="tablist"
              aria-label="Filter services by journey phase"
            >
              {servicePhases.map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  role="tab"
                  aria-selected={activePhase === phase.id}
                  className={`${styles.phaseBtn} ${
                    activePhase === phase.id ? styles.phaseBtnActive : ""
                  }`}
                  onClick={() => setActivePhase(phase.id)}
                >
                  {phase.label}
                </button>
              ))}
            </div>

            <div key={activePhase} className={styles.bentoGrid}>
              {filtered.length === 0 ? (
                <p className={styles.emptyState}>No services in this phase yet.</p>
              ) : null}
              {filtered.map((service) => (
                <div
                  key={service.id}
                  className={`${styles.bentoItem} ${
                    service.featured ? styles.bentoItemWide : ""
                  }`}
                >
                  <ServiceCard service={service} />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.flowBlock}>
            <AbstractBackground />
            <div className={styles.flowBlockInner}>
              <p className={styles.sectionLabel}>How it connects</p>
              <h2 className={styles.sectionTitle}>Services that compound</h2>
              <p className={styles.flowIntro}>
                Each step feeds the next — advisory sets direction, ATS scoring sharpens
                your resume, practice builds confidence, and managed applications turn
                preparation into offers.
              </p>

              <div className={styles.flowGrid}>
                <div className={styles.flowCard}>
                  <span className={styles.flowStep}>01</span>
                  <h3>Discover with advisory</h3>
                  <p>Define target roles and a realistic timeline with expert guidance.</p>
                </div>
                <div className={styles.flowArrow} aria-hidden>
                  →
                </div>
                <div className={styles.flowCard}>
                  <span className={styles.flowStep}>02</span>
                  <h3>Prepare your profile</h3>
                  <p>Score your resume, fix gaps, and keep materials ready in one hub.</p>
                </div>
                <div className={styles.flowArrow} aria-hidden>
                  →
                </div>
                <div className={styles.flowCard}>
                  <span className={styles.flowStep}>03</span>
                  <h3>Practice interviews</h3>
                  <p>Voice mock sessions with company-style personas.</p>
                </div>
                <div className={styles.flowArrow} aria-hidden>
                  →
                </div>
                <div className={`${styles.flowCard} ${styles.flowCardAccent}`}>
                  <span className={styles.flowStep}>04</span>
                  <h3>Apply with our team</h3>
                  <p>We search, apply, and track roles — you see every application in your portal.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.freeStrip}>
            <p className={styles.freeStripLabel}>Always free with your account</p>
            <ul className={styles.freeStripList}>
              {freeIncludedServices.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.bottomCta}>
            <h2>Ready to start?</h2>
            <p>
              Create a free account for career advisory, ATS scoring, and your calendar.
              Add mock interviews from {formatPlanPriceMonthly(79.99)}, applications from{" "}
              {formatPlanPriceMonthly(99.99)}, or the bundle for{" "}
              {formatPlanPriceMonthly(149.99)}.
            </p>
            <Link href="/signup" className={styles.planCta}>
              Create free account
            </Link>
          </div>

          <p className={styles.contactNote}>
            Questions?{" "}
            <Link href="/#contact" className={styles.contactLink}>
              Contact us
            </Link>{" "}
            or{" "}
            <Link href="/login" className={styles.contactLink}>
              sign in
            </Link>{" "}
            to your portal.
          </p>
        </div>
      </section>
    </div>
  );
}
