import Link from "next/link";
import { ArrowRight, Compass, GraduationCap, Briefcase, Mic } from "lucide-react";
import { servicePhases } from "@/lib/candidate-services";
import styles from "./welcome-page.module.css";

const phaseIcons = {
  discover: Compass,
  prepare: GraduationCap,
  practice: Mic,
  apply: Briefcase,
} as const;

const journeyPhases = servicePhases.filter((phase) => phase.id !== "all");

export function WelcomeServicesSection() {
  return (
    <section id="products" className={styles.servicesSection}>
      <div className={styles.sectionContent}>
        <div className={styles.sectionHeader}>
          <p className={styles.label}>
            <span className={styles.labelDot} /> What&apos;s inside
          </p>
          <h2 className={styles.sectionTitle}>
            Everything to go from <em className={styles.sectionTitleEm}>graduate to hired</em>
          </h2>
          <p className={styles.sectionSub}>
            Four clear phases — discover, prepare, practice, and apply — with full plan details
            on the products page.
          </p>
        </div>

        <div className={styles.servicesGrid}>
          {journeyPhases.map((phase) => {
            const Icon = phaseIcons[phase.id as keyof typeof phaseIcons] ?? Compass;
            return (
              <article key={phase.id} className={styles.serviceDetailCard}>
                <div className={styles.serviceDetailIcon}>
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </div>
                <h3 className={styles.serviceDetailTitle}>{phase.label}</h3>
                <p className={styles.serviceDetailDesc}>{phase.summary}</p>
              </article>
            );
          })}
        </div>

        <div className={styles.productsCta}>
          <Link href="/products" className={styles.btnSecondary}>
            See plans &amp; pricing
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
