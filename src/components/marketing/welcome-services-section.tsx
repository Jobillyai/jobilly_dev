import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { servicePhases } from "@/lib/candidate-services";
import { WelcomePipelineHeroCard } from "./welcome-pipeline-hero-card";
import revealStyles from "./welcome-reveal.module.css";
import styles from "./welcome-page.module.css";

const journeyPhases = servicePhases.filter((phase) => phase.id !== "all");

export function WelcomeServicesSection() {
  return (
    <section id="products" className={styles.openSection}>
      <div className={styles.sectionContent}>
        <h2
          className={`${styles.openTitle} ${revealStyles.revealFromLeft}`}
          data-reveal
          data-reveal-visible-class="revealed"
        >
          What&apos;s inside
        </h2>
        <p className={styles.openIntro}>
          Four clear phases to take you from graduate to hired. Full plan details live on
          the products page.
        </p>

        <div className={styles.openCardsRow}>
          <ul className={styles.openList}>
            {journeyPhases.map((phase) => (
              <li key={phase.id} className={styles.openItem}>
                <div className={styles.openItemMain}>
                  <h3 className={styles.openItemTitle}>{phase.label}</h3>
                  <p className={styles.openItemDesc}>{phase.summary}</p>
                </div>
                <Link href="/products" className={styles.openItemLink}>
                  Learn more
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          <aside className={styles.openAside}>
            <WelcomePipelineHeroCard />
          </aside>
        </div>

        <div className={styles.openFooter}>
          <Link href="/products" className={styles.btnPrimary}>
            See plans &amp; pricing
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
