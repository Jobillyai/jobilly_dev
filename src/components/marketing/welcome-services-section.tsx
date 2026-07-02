import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  Compass,
  GraduationCap,
  Mic,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { AbstractBackground } from "@/components/layout/abstract-background";
import {
  candidateServices,
  formatPlanPriceMonthly,
  premiumPlans,
  servicePhases,
  type CandidateService,
  type ServicePhase,
} from "@/lib/candidate-services";
import styles from "./welcome-page.module.css";

const serviceIcons: Record<string, typeof Compass> = {
  "career-advisory": Compass,
  profile: UserCircle,
  calendar: Calendar,
  "growth-school": GraduationCap,
  "mock-interviews": Mic,
  applications: Briefcase,
};

function ServiceBadge({ service }: { service: CandidateService }) {
  if (service.tier === "premium" && service.priceUsd !== undefined) {
    return (
      <span className={styles.badgePremium}>{formatPlanPriceMonthly(service.priceUsd)}</span>
    );
  }
  if (service.status === "coming_soon") {
    return <span className={styles.badgeSoon}>Coming soon</span>;
  }
  return <span className={styles.badgeFree}>Free</span>;
}

function ServiceDetailCard({ service }: { service: CandidateService }) {
  const Icon = serviceIcons[service.id] ?? Sparkles;
  const phaseLabel =
    servicePhases.find((phase) => phase.id === service.phase)?.label ?? service.phase;

  return (
    <article
      className={`${styles.serviceDetailCard} ${
        service.featured ? styles.serviceDetailCardFeatured : ""
      }`}
    >
      <div className={styles.serviceDetailTop}>
        <div className={styles.serviceDetailIcon}>
          <Icon size={22} strokeWidth={2} aria-hidden />
        </div>
        <div className={styles.serviceDetailMeta}>
          <span className={styles.serviceDetailPhase}>{phaseLabel}</span>
          <ServiceBadge service={service} />
        </div>
      </div>

      <p className={styles.serviceDetailTagline}>{service.tagline}</p>
      <h3 className={styles.serviceDetailTitle}>{service.title}</h3>
      <p className={styles.serviceDetailDesc}>{service.description}</p>

      <ul className={styles.serviceDetailList}>
        {service.highlights.map((item) => (
          <li key={item}>
            <Check size={14} strokeWidth={2.5} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

const phaseOrder: ServicePhase[] = ["discover", "prepare", "practice", "apply"];

export function WelcomeServicesSection() {
  return (
    <>
      <section id="products" className={styles.servicesSection}>
        <AbstractBackground />
        <div className={styles.sectionContent}>
          <div
            className={`${styles.label} ${styles.reveal}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            <div className={styles.labelDot} /> What&#x2019;s inside
          </div>
          <div
            className={`${styles.sectionTitle} ${styles.reveal}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            Everything you need to go from{" "}
            <em className={styles.sectionTitleEm}>graduate to hired</em>
          </div>
          <p
            className={`${styles.sectionSub} ${styles.sectionSubWide} ${styles.reveal}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            Seven services across discover, prepare, practice, and apply — from your first mentor
            session to managed applications on Indeed and LinkedIn.
          </p>

          {phaseOrder.map((phaseId, index) => {
            const phase = servicePhases.find((item) => item.id === phaseId);
            const services = candidateServices.filter((service) => service.phase === phaseId);
            if (!phase || services.length === 0) {
              return null;
            }

            return (
              <div
                key={phaseId}
                className={`${styles.phaseBlock} ${styles.reveal} ${styles[`d${index + 1}` as "d1"]}`}
                data-reveal
                data-reveal-visible-class={styles.revealVisible}
              >
                <div className={styles.phaseHeader}>
                  <h3 className={styles.phaseTitle}>{phase.label}</h3>
                  <p className={styles.phaseSummary}>{phase.summary}</p>
                </div>
                <div className={styles.servicesGrid}>
                  {services.map((service) => (
                    <ServiceDetailCard key={service.id} service={service} />
                  ))}
                </div>
              </div>
            );
          })}

          <div className={styles.productsCta}>
            <Link href="/products" className={styles.btnOutlineBlue}>
              View full pricing &amp; plan details
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.premiumSection}>
        <div className={styles.sectionInner}>
          <div
            className={`${styles.label} ${styles.reveal}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            <div className={styles.labelDot} /> Premium plans
          </div>
          <div
            className={`${styles.sectionTitle} ${styles.reveal}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            Practice harder. Apply smarter.{" "}
            <em className={styles.sectionTitleEm}>Or do both.</em>
          </div>
          <p
            className={`${styles.sectionSub} ${styles.sectionSubWide} ${styles.reveal}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            Subscribe to mock interviews, managed job applications, or the full bundle — while free
            tools stay included with your account.
          </p>

          <div className={styles.premiumGrid}>
            {premiumPlans.map((plan) => (
              <article
                key={plan.id}
                className={`${styles.premiumCard} ${plan.featured ? styles.premiumCardFeatured : ""} ${styles.reveal}`}
                data-reveal
                data-reveal-visible-class={styles.revealVisible}
              >
                {plan.featured ? (
                  <span className={styles.premiumFeaturedBadge}>Best value</span>
                ) : null}
                <p className={styles.premiumCardTagline}>{plan.tagline}</p>
                <h3 className={styles.premiumCardTitle}>{plan.title}</h3>
                <p className={styles.premiumCardPrice}>{formatPlanPriceMonthly(plan.priceUsd)}</p>
                <p className={styles.premiumCardDesc}>{plan.description}</p>
                {plan.savingsLabel ? (
                  <p className={styles.premiumSavings}>{plan.savingsLabel}</p>
                ) : null}
              </article>
            ))}
          </div>

          <div className={styles.productsCta}>
            <Link href="/products" className={styles.btnOutlineBlue}>
              Compare plans on the products page
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
