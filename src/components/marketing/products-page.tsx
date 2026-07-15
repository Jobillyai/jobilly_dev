"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  Compass,
  Eye,
  GraduationCap,
  Layers,
  Mic,
  Sparkles,
  Target,
  UserCircle,
  Users,
} from "lucide-react";
import { AbstractBackground } from "@/components/layout/abstract-background";
import {
  candidateServices,
  defaultPremiumPlanId,
  formatPlanPrice,
  formatPlanPriceMonthly,
  getServicesByPhase,
  premiumPlans,
  servicePhases,
  type CandidateService,
  type PremiumPlanId,
  type ServicePhase,
} from "@/lib/candidate-services";
import styles from "./products-page.module.css";
import shell from "./marketing-shell.module.css";

const serviceIcons: Record<string, typeof Compass> = {
  "career-advisory": Compass,
  profile: UserCircle,
  calendar: Calendar,
  "growth-school": GraduationCap,
  "mock-interviews": Mic,
  applications: Briefcase,
};

const phaseIcons: Record<ServicePhase, typeof Compass> = {
  discover: Compass,
  prepare: GraduationCap,
  practice: Mic,
  apply: Briefcase,
};

const phaseAccentClass: Record<ServicePhase, string | undefined> = {
  discover: styles.journeyDiscover,
  prepare: styles.journeyPrepare,
  practice: styles.journeyPractice,
  apply: styles.journeyApply,
};

const valuePoints = [
  {
    icon: Users,
    title: "Human oversight",
    text: "Real mentors and recruiters review applications — not spray-and-pray automation.",
  },
  {
    icon: Target,
    title: "Quality over quantity",
    text: "Matched roles on Indeed and LinkedIn, tailored resumes, and thoughtful outreach.",
  },
  {
    icon: Eye,
    title: "Portal visibility",
    text: "Every application, session, and score lives in your candidate dashboard.",
  },
] as const;

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
  const phase = servicePhases.find((item) => item.id === service.phase);
  const premiumPlanId =
    service.id === "mock-interviews" ? "mock-interviews" : "job-applications";
  const checkoutHref = {
    pathname: "/signup",
    query: { next: `/dashboard/plans?plan=${premiumPlanId}` },
  };

  return (
    <article
      className={`${styles.serviceCard} ${service.featured ? styles.serviceCardFeatured : ""} ${
        isComingSoon ? styles.serviceCardSoon : ""
      } ${phaseAccentClass[service.phase] ?? ""}`}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardIconWrap}>
          <Icon size={22} strokeWidth={2} aria-hidden />
        </div>
        <div className={styles.cardBadges}>
          {phase ? <span className={styles.phasePill}>{phase.label}</span> : null}
          <StatusBadge service={service} />
        </div>
      </div>

      <p className={styles.cardTagline}>{service.tagline}</p>
      <h3 className={styles.cardTitle}>{service.title}</h3>
      <p className={styles.cardDesc}>{service.description}</p>

      <div className={styles.highlightPanel}>
        <p className={styles.highlightPanelLabel}>What you get</p>
        <ul className={styles.highlightList}>
          {service.highlights.map((item) => (
            <li key={item}>
              <span className={styles.checkIcon} aria-hidden>
                <Check size={13} strokeWidth={2.5} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {service.tier === "premium" ? (
        <Link href={checkoutHref} className={styles.cardLink}>
          Select plan <ArrowRight size={14} aria-hidden />
        </Link>
      ) : service.dashboardHref && !isComingSoon ? (
        <Link href={service.dashboardHref} className={styles.cardLink}>
          Open in portal <ArrowRight size={14} aria-hidden />
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
  const liveCount = candidateServices.filter((service) => service.status === "live").length;
  const freeCount = candidateServices.filter((service) => service.tier === "free").length;

  return (
    <div className={shell.page}>
      <section className={shell.hero}>
        <AbstractBackground />
        <div className={shell.heroContent}>
          <div className={shell.heroInner}>
            <p className={shell.heroEyebrow}>Premium candidate services</p>
            <h1 className={shell.heroTitle}>
              One plan. <span className={shell.brandWord}>Real results.</span>
            </h1>
            <p className={shell.heroSub}>
              Practice mock interviews, let our team apply to matched roles, or get both —
              while free career tools keep you on track from graduate to hired.
            </p>

            <div className={shell.heroActions}>
              <Link href="/signup" className={shell.btnPrimary}>
                Get started free
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="#pricing" className={shell.btnSecondary}>
                View plans
              </Link>
            </div>

            <p className={shell.heroNote}>Free advisory and portal tools included.</p>
          </div>
        </div>

        <div className={shell.statsBand}>
          <div className={shell.statItem}>
            <span className={shell.statValue}>{candidateServices.length}</span>
            <span className={shell.statLabel}>Services</span>
          </div>
          <div className={shell.statItem}>
            <span className={shell.statValue}>{liveCount}</span>
            <span className={shell.statLabel}>Live today</span>
          </div>
          <div className={shell.statItem}>
            <span className={shell.statValue}>{freeCount}</span>
            <span className={shell.statLabel}>Free tools</span>
          </div>
          <div className={shell.statItem}>
            <span className={shell.statValue}>{premiumPlans.length}</span>
            <span className={shell.statLabel}>Premium plans</span>
          </div>
        </div>
      </section>

      <section id="pricing" className={`${shell.section} ${styles.pricingSection}`}>
        <div className={shell.sectionContent}>
          <p className={shell.sectionLabel}>Pricing</p>
          <h2 className={shell.sectionTitle}>Choose your premium plan</h2>
          <div className={styles.pricingWrap}>
            <div className={styles.planCompareGrid}>
            {premiumPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`${styles.planCompareCard} ${
                  activePlanId === plan.id ? styles.planCompareCardActive : ""
                } ${plan.featured ? styles.planCompareCardFeatured : ""}`}
                onClick={() => setActivePlanId(plan.id)}
                aria-pressed={activePlanId === plan.id}
              >
                {plan.featured ? (
                  <span className={styles.planCompareBadge}>Best value</span>
                ) : null}
                <span className={styles.planCompareName}>{plan.shortLabel}</span>
                <span className={styles.planComparePrice}>
                  {formatPlanPriceMonthly(plan.priceUsd)}
                </span>
                <span className={styles.planCompareTagline}>{plan.tagline}</span>
                <span className={styles.planCompareCount}>
                  <Layers size={14} aria-hidden />
                  {plan.includes.length} included points
                </span>
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

            <div className={styles.featurePanel}>
              <p className={styles.featurePanelLabel}>Everything included</p>
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
            </div>

            <Link
              href={{
                pathname: "/signup",
                query: { next: `/dashboard/plans?plan=${activePlan.id}` },
              }}
              className={`${shell.btnPrimary} ${styles.planCta}`}
            >
              {activePlan.ctaLabel}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </article>
          </div>
        </div>
      </section>

      <section className={`${shell.section} ${shell.sectionMuted} ${styles.detailsSection}`}>
        <div className={`${shell.sectionContent} ${styles.detailsInner}`}>
          <div className={styles.valueBlock}>
            <p className={shell.sectionLabel}>Why Jobilly</p>
            <h2 className={shell.sectionTitle}>Built for outcomes, not noise</h2>
            <div className={styles.valueGrid}>
              {valuePoints.map((point) => {
                const Icon = point.icon;
                return (
                  <article key={point.title} className={styles.valueCard}>
                    <div className={styles.valueIconWrap}>
                      <Icon size={20} strokeWidth={2} aria-hidden />
                    </div>
                    <h3>{point.title}</h3>
                    <p>{point.text}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className={styles.journeyBlock}>
            <p className={shell.sectionLabel}>The candidate journey</p>
            <h2 className={shell.sectionTitle}>Four phases. One platform.</h2>
            <div className={styles.journeyTrack}>
              {servicePhases.slice(1).map((phase, index) => {
                const PhaseIcon = phaseIcons[phase.id as ServicePhase];
                return (
                  <div
                    key={phase.id}
                    className={`${styles.journeyStep} ${phaseAccentClass[phase.id as ServicePhase] ?? ""}`}
                  >
                    <div className={styles.journeyStepTop}>
                      <div className={styles.journeyIconWrap}>
                        <PhaseIcon size={18} strokeWidth={2} aria-hidden />
                      </div>
                      <div className={styles.journeyNum}>{index + 1}</div>
                    </div>
                    <p className={styles.journeyLabel}>{phase.label}</p>
                    <p className={styles.journeySummary}>{phase.summary}</p>
                    <div className={styles.journeyBar} aria-hidden>
                      <span style={{ width: `${((index + 1) / 4) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.catalogBlock}>
            <div className={styles.catalogHeader}>
              <div>
                <p className={shell.sectionLabel}>Service catalog</p>
                <h2 className={shell.sectionTitle}>What you get as a candidate</h2>
              </div>
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

          <p className={styles.contactNote}>
            Questions?{" "}
            <Link href="/contact" className={styles.contactLink}>
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

      <section className={shell.ctaSection}>
        <div className={shell.sectionContent}>
          <div className={shell.ctaInner}>
            <h2 className={shell.ctaTitle}>
              Ready to start your
              <br />
              job search journey?
            </h2>
            <p className={shell.ctaSub}>
              Create a free account to access career advisory, your portal dashboard,
              and premium plans when you are ready.
            </p>
            <div className={shell.ctaActions}>
              <Link href="/signup" className={shell.btnPrimary}>
                Get started free
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/contact" className={shell.btnSecondary}>
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
