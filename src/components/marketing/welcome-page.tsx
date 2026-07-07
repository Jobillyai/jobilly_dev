"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import styles from "./welcome-page.module.css";
import { CompaniesMarquee } from "./companies-marquee";
import { HeroPreview } from "./hero-preview";
import { WelcomeServicesSection } from "./welcome-services-section";
import { JobenChatWidget } from "./joben-chat-widget";
import { useScrollReveal } from "./use-scroll-reveal";

export function WelcomePage() {
  const revealRef = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }

    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className={styles.page} ref={revealRef}>
      <section className={styles.hero}>
        <div className={styles.heroBgOrb1} aria-hidden />
        <div className={styles.heroBgOrb2} aria-hidden />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.heroEyebrow}>
              <Star size={14} aria-hidden />
              AI-powered career platform
            </div>

            <h1 className={styles.h1}>
              Land your first job
              <br />
              <em className={styles.h1Em}>without the chaos</em>
            </h1>

            <p className={styles.heroSub}>
              Jobilly gives graduates one clean workspace — career advisory, interview prep,
              and a team that applies to roles on your behalf.
            </p>

            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.btnPrimary}>
                Get started free
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/products" className={styles.btnSecondary}>
                View plans
              </Link>
            </div>

            <div className={styles.heroMetrics}>
              <div className={styles.metric}>
                <strong>Free</strong>
                <span>Career advisory</span>
              </div>
              <div className={styles.metricDivider} aria-hidden />
              <div className={styles.metric}>
                <strong>AI</strong>
                <span>Mock interviews</span>
              </div>
              <div className={styles.metricDivider} aria-hidden />
              <div className={styles.metric}>
                <strong>Team</strong>
                <span>Managed apply</span>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <HeroPreview />
          </div>
        </div>
      </section>

      <div className={styles.companiesStrip}>
        <p className={styles.companiesLabel}>Built for candidates targeting teams like</p>
        <CompaniesMarquee />
      </div>

      <WelcomeServicesSection />

      <div id="community" className={styles.instSection}>
        <div className={styles.instInner}>
          <div className={styles.revealLeft} data-reveal data-reveal-visible-class={styles.revealLeftVisible}>
            <div className={`${styles.label} ${styles.instLabel}`}>
              <div className={styles.labelDot} /> For universities &amp; companies
            </div>
            <div className={styles.instTitle}>
              Jobilly for <em className={styles.instTitleEm}>Institutions</em>
            </div>
            <p className={styles.instSub}>
              Partner with us to give your students or employees Growth School, Career Advisory,
              and Mock Interviews — co-branded under one subscription.
            </p>
            <Link href="/contact" className={styles.btnPrimary}>
              Get in touch
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className={styles.instCards} data-reveal data-reveal-visible-class={styles.revealRightVisible}>
            <div className={`${styles.instCardItem} ${styles.revealRight}`}>
              <div className={styles.instCardIcon}>01</div>
              <div className={styles.instCardText}>
                <h4>Your brand, our platform</h4>
                <p>Co-branded experience with your institution&apos;s logo and colours.</p>
              </div>
            </div>
            <div className={`${styles.instCardItem} ${styles.revealRight}`}>
              <div className={styles.instCardIcon}>02</div>
              <div className={styles.instCardText}>
                <h4>Progress dashboards</h4>
                <p>Admins track student progress across every feature.</p>
              </div>
            </div>
            <div className={`${styles.instCardItem} ${styles.revealRight}`}>
              <div className={styles.instCardIcon}>03</div>
              <div className={styles.instCardText}>
                <h4>One subscription</h4>
                <p>Single institution billing covers your entire cohort.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <JobenChatWidget />
    </div>
  );
}
