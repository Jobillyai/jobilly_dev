"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./welcome-page.module.css";
import revealStyles from "./welcome-reveal.module.css";
import { CompaniesMarquee } from "./companies-marquee";
import { WelcomeHeroCarousel } from "./welcome-hero-carousel";
import { WelcomeHeroMesh, WelcomeWaveMesh } from "./welcome-hero-mesh";
import { WelcomePipelineSection } from "./welcome-pipeline-section";
import { WelcomeServicesSection } from "./welcome-services-section";
import { JobenChatWidget } from "./joben-chat-widget";
import { useScrollReveal } from "./use-scroll-reveal";

const platformStats = [
  { value: "4", label: "career phases" },
  { value: "Free", label: "advisory sessions" },
  { value: "AI", label: "interview practice" },
  { value: "Team", label: "managed apply" },
] as const;

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
        <WelcomeHeroMesh />
        <div className={styles.heroGrid}>
          <div className={styles.heroInner}>
            <p className={styles.heroEyebrow}>Graduate career portal</p>
            <h1
              className={`${styles.h1} ${revealStyles.revealFromLeft}`}
              data-reveal
              data-reveal-visible-class="revealed"
            >
              Be ready to apply to every role that fits you.{" "}
              <span className={styles.brandWord}>Hands on.</span>
            </h1>

            <p className={styles.heroSub}>
              Free career advisory, interview prep, and managed applications — discover,
              prepare, apply, and track everything from one calm workspace.
            </p>

            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.btnPrimary}>
                Get started free
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="#pipeline" className={styles.btnSecondary}>
                See how it works
              </Link>
            </div>

            <p className={styles.heroNote}>Free advisory sessions — no card required.</p>
          </div>

          <div className={styles.heroPreview}>
            <WelcomeHeroCarousel />
          </div>
        </div>

        <div className={styles.statsBand}>
          {platformStats.map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <WelcomePipelineSection />

      <section className={styles.editorialSection}>
        <WelcomeWaveMesh direction="tl-br" lineCount={52} />
        <div className={styles.sectionContent}>
          <div className={styles.editorialInner}>
            <h2
              className={`${styles.editorialTitle} ${revealStyles.revealFromRight}`}
              data-reveal
              data-reveal-visible-class="revealed"
            >
              Hey there,
            </h2>
            <div className={styles.editorialCopy}>
              <p>
                This is not a typical job board. Jobilly is built for people at the start
                of their career — when every application matters and good guidance is hard
                to find. We combine free career advisory with tools that grow with you:
                profile and resume hub, session calendar, practice, and managed
                applications when you want hands-on help.
              </p>
              <p>
                As a team, we believe in clear paths over chaos. No spray-and-pray
                applying. No generic advice copied from a blog post. Just discover →
                prepare → practice → apply, with humans in the loop when it counts.
              </p>
              <p>
                We keep everything in one portal so you are not juggling tabs,
                spreadsheets, and scattered PDFs. And when you are ready for managed
                apply, our team searches roles, tailors resumes, and tracks every
                application — you stay in control from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <WelcomeServicesSection />

      <div className={styles.companiesStrip}>
        <WelcomeWaveMesh direction="bl-tr" lineCount={52} extent="strip" />
        <div className={styles.companiesStripInner}>
          <p className={styles.companiesLabel}>
            Built for candidates targeting teams like
          </p>
          <CompaniesMarquee />
        </div>
      </div>

      <section className={styles.ctaSection}>
        <div className={styles.sectionContent}>
          <div className={styles.ctaInner}>
            <h2
              className={`${styles.ctaTitle} ${revealStyles.revealFromLeft}`}
              data-reveal
              data-reveal-visible-class="revealed"
            >
              Can&apos;t find what
              <br />
              you are looking for?
            </h2>
            <p className={styles.ctaSub}>
              We partner with universities and employers too. Tell us what you need —
              for yourself or your cohort — and we will point you in the right direction.
            </p>
            <div className={styles.ctaActions}>
              <Link href="/contact" className={styles.btnPrimary}>
                Get in touch
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/products" className={styles.btnSecondary}>
                View plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <JobenChatWidget />
    </div>
  );
}
