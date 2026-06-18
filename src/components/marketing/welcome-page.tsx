"use client";

import Link from "next/link";
import { AbstractBackground } from "@/components/layout/abstract-background";
import styles from "./welcome-page.module.css";
import { EmailCaptureForm } from "./email-capture-form";
import { FeatureCards } from "./feature-cards";
import { useScrollReveal } from "./use-scroll-reveal";
import { useCounterAnimation } from "./use-counter-animation";

export function WelcomePage() {
  const revealRef = useScrollReveal<HTMLDivElement>();
  const statsRef = useCounterAnimation<HTMLDivElement>();

  return (
    <div className={styles.page} ref={revealRef}>

      {/* HERO */}
      <div className={styles.hero}>
        <AbstractBackground />

        <div className={styles.heroEyebrow}>
          <div className={styles.pulseDot} />
          We&#x2019;re building something crazy you haven&#x2019;t seen before
        </div>

        <h1 className={styles.h1}>
          Land your first job
          <br />
          <em className={styles.h1Em}>with AI on your side</em>
        </h1>

        <p className={styles.heroSub}>
          The career platform built for{" "}
          <strong className={styles.heroSubStrong}>fresh graduates and postgrads</strong> &#x2014;
          AI-powered learning, voice mock interviews with real company personas, and a team that
          applies to jobs <strong className={styles.heroSubStrong}>on your behalf</strong>.
        </p>

        <EmailCaptureForm inputId="heroEmail" buttonLabel="Notify Me" />
        <p className={styles.formNote}>Be first when we launch. No spam, ever.</p>

        <div className={styles.trustStrip}>
          <div className={styles.trustItem}>
            <svg className={styles.trustIcon} viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L12.39 7.26L18 8.18L14 12.08L14.9 17.66L10 15.13L5.1 17.66L6 12.08L2 8.18L7.61 7.26L10 2Z"
                fill="#1877F2"
                stroke="#1877F2"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            Free to start
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            <svg className={styles.trustIcon} viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#1877F2" strokeWidth="1.5" />
              <path
                d="M7 10L9.5 12.5L13 7.5"
                stroke="#1877F2"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No credit card needed
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            <svg className={styles.trustIcon} viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2C10 2 4 5 4 10.5C4 14.09 6.69 17 10 17C13.31 17 16 14.09 16 10.5C16 5 10 2 10 2Z"
                stroke="#1877F2"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M10 8V11M10 13V13.5" stroke="#1877F2" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Built for graduates
          </div>
          <div className={styles.trustDivider} />
          <div className={styles.trustItem}>
            <svg className={styles.trustIcon} viewBox="0 0 20 20" fill="none">
              <rect x="3" y="6" width="14" height="10" rx="2" stroke="#1877F2" strokeWidth="1.5" />
              <path d="M7 6V5C7 3.9 7.9 3 9 3H11C12.1 3 13 3.9 13 5V6" stroke="#1877F2" strokeWidth="1.5" />
              <path d="M10 11V13M10 9V9.5" stroke="#1877F2" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            AI-powered interviews
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className={styles.statsSection}>
        <div className={styles.statsInner} ref={statsRef}>
          <div className={`${styles.statItem} ${styles.reveal}`} data-reveal data-reveal-visible-class={styles.revealVisible}>
            <div className={styles.statNum}>
              <span className={styles.counting} data-counter-target="4">
                0
              </span>
            </div>
            <div className={styles.statLabel}>Career Features</div>
          </div>
          <div
            className={`${styles.statItem} ${styles.reveal} ${styles.d1}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            <div className={styles.statNum}>
              <span className={styles.statNumBlue}>100%</span>
            </div>
            <div className={styles.statLabel}>Free to start learning</div>
          </div>
          <div
            className={`${styles.statItem} ${styles.reveal} ${styles.d2}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            <div className={styles.statNum}>
              <span className={styles.counting} data-counter-target="6">
                0
              </span>
              +
            </div>
            <div className={styles.statLabel}>Company interview personas</div>
          </div>
          <div
            className={`${styles.statItem} ${styles.reveal} ${styles.d3}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            <div className={styles.statNum}>
              <span className={styles.statNumBlue}>AI</span>
            </div>
            <div className={styles.statLabel}>Applies jobs for you</div>
          </div>
        </div>
      </div>

      {/* COMPANIES */}
      <div className={styles.companiesStrip}>
        <AbstractBackground />
        <div className={styles.sectionContent}>
        <div className={styles.companiesLabel}>Practice interviewing for roles at</div>
        <div className={styles.companiesLogos}>
          <div className={styles.companyLogo}>Meta</div>
          <div className={styles.companyLogo}>Google</div>
          <div className={styles.companyLogo}>Amazon</div>
          <div className={styles.companyLogo}>Apple</div>
          <div className={styles.companyLogo}>Microsoft</div>
          <div className={styles.companyLogo}>Startups</div>
        </div>
        </div>
      </div>

      {/* FEATURES */}
      <section className={styles.section}>
        <AbstractBackground />
        <div className={styles.sectionContent}>
        <div className={`${styles.label} ${styles.reveal}`} data-reveal data-reveal-visible-class={styles.revealVisible}>
          <div className={styles.labelDot} /> What&#x2019;s inside
        </div>
        <div
          className={`${styles.sectionTitle} ${styles.reveal}`}
          data-reveal
          data-reveal-visible-class={styles.revealVisible}
        >
          Everything you need to go from
          <br />
          <em className={styles.sectionTitleEm}>graduate to hired</em>
        </div>
        <p className={`${styles.sectionSub} ${styles.reveal}`} data-reveal data-reveal-visible-class={styles.revealVisible}>
          Four features, working together. Start free and unlock more as you need it.
        </p>

        <FeatureCards />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className={`${styles.sectionFull} ${styles.hiwBg}`}>
        <AbstractBackground />
        <div className={styles.sectionInner}>
          <div className={`${styles.label} ${styles.reveal}`} data-reveal data-reveal-visible-class={styles.revealVisible}>
            <div className={styles.labelDot} /> The path
          </div>
          <div
            className={`${styles.sectionTitle} ${styles.reveal}`}
            data-reveal
            data-reveal-visible-class={styles.revealVisible}
          >
            How Jobilly works <em className={styles.sectionTitleEm}>for you</em>
          </div>
          <div className={styles.stepsGrid}>
            <div
              className={`${styles.stepCard} ${styles.reveal} ${styles.d1}`}
              data-reveal
              data-reveal-visible-class={styles.revealVisible}
            >
              <div className={styles.stepNumWrap}>1</div>
              <h3>Book your free career session</h3>
              <p>
                Talk to a mentor. Share your education, interests, and where you want to go. Walk
                away with a clear, personalised learning path.
              </p>
            </div>
            <div
              className={`${styles.stepCard} ${styles.reveal} ${styles.d2}`}
              data-reveal
              data-reveal-visible-class={styles.revealVisible}
            >
              <div className={styles.stepNumWrap}>2</div>
              <h3>Build real skills in Growth School</h3>
              <p>
                Follow your learning path lesson by lesson. Watch, quiz, code. Every topic builds
                on the last. Progress unlocks the next challenge.
              </p>
            </div>
            <div
              className={`${styles.stepCard} ${styles.reveal} ${styles.d3}`}
              data-reveal
              data-reveal-visible-class={styles.revealVisible}
            >
              <div className={styles.stepNumWrap}>3</div>
              <h3>Practice until interviews feel easy</h3>
              <p>
                Run voice mock interviews against a Meta or Google interviewer persona. Get
                scored, get feedback, and do it again until it&#x2019;s natural.
              </p>
            </div>
            <div
              className={`${styles.stepCard} ${styles.reveal} ${styles.d4}`}
              data-reveal
              data-reveal-visible-class={styles.revealVisible}
            >
              <div className={styles.stepNumWrap}>4</div>
              <h3>Let us handle the applications</h3>
              <p>
                Your dedicated Jobilly recruiter applies to matched roles, tailors your resume for
                each one, and keeps you updated in real time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* INSTITUTIONS */}
      <div className={styles.instSection}>
        <div className={styles.instInner}>
          <div className={styles.revealLeft} data-reveal data-reveal-visible-class={styles.revealLeftVisible}>
            <div className={`${styles.label} ${styles.instLabel}`}>
              <div className={styles.labelDot} /> For universities &amp; companies
            </div>
            <div className={styles.instTitle}>
              Jobilly for <em className={styles.instTitleEm}>Institutions</em>
            </div>
            <p className={styles.instSub}>
              Partner with us to give your students or employees access to Growth School, Career
              Advisory, and Mock Interviews &#x2014; all under your institution&#x2019;s branding with a
              single subscription.
            </p>
            <Link href="/signup" className={styles.btnOutlineWhite}>
              Get in touch
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8H13M9 4L13 8L9 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
          <div className={styles.instCards} data-reveal data-reveal-visible-class={styles.revealRightVisible}>
            <div className={`${styles.instCardItem} ${styles.revealRight}`}>
              <div className={styles.instCardIcon}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M11 2L3 7V10C3 15 6.5 19.5 11 21C15.5 19.5 19 15 19 10V7L11 2Z"
                    stroke="#4A9FFF"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 11L10.5 13.5L14 8.5"
                    stroke="#4A9FFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.instCardText}>
                <h4>Your brand, our platform</h4>
                <p>Co-branded experience with your institution&#x2019;s logo and colours.</p>
              </div>
            </div>
            <div className={`${styles.instCardItem} ${styles.revealRight}`}>
              <div className={styles.instCardIcon}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="3" width="16" height="16" rx="3" stroke="#4A9FFF" strokeWidth="1.8" />
                  <path
                    d="M7 11L9.5 13.5L15 8"
                    stroke="#4A9FFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.instCardText}>
                <h4>Progress dashboards</h4>
                <p>Admins and professors track student progress across all features.</p>
              </div>
            </div>
            <div className={`${styles.instCardItem} ${styles.revealRight}`}>
              <div className={styles.instCardIcon}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="6" width="16" height="12" rx="2.5" stroke="#4A9FFF" strokeWidth="1.8" />
                  <path d="M7 6V5C7 3.9 7.9 3 9 3H13C14.1 3 15 3.9 15 5V6" stroke="#4A9FFF" strokeWidth="1.8" />
                  <path d="M11 11V13M11 9V9.5" stroke="#4A9FFF" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className={styles.instCardText}>
                <h4>One subscription, all students</h4>
                <p>Single institution billing covers your entire cohort.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className={styles.ctaSection}>
        <AbstractBackground />
        <div className={styles.sectionContent}>
        <div
          className={`${styles.sectionTitle} ${styles.reveal}`}
          style={{ maxWidth: 640, margin: "0 auto 16px" }}
          data-reveal
          data-reveal-visible-class={styles.revealVisible}
        >
          Your first job is <em className={styles.sectionTitleEm}>closer</em> than you think
        </div>
        <p className={`${styles.reveal} ${styles.d1}`} data-reveal data-reveal-visible-class={styles.revealVisible}>
          Join the waitlist. First users get 3 months free on the premium plan.
        </p>
        <div
          className={`${styles.reveal} ${styles.d2}`}
          style={{ marginBottom: 12 }}
          data-reveal
          data-reveal-visible-class={styles.revealVisible}
        >
          <EmailCaptureForm inputId="ctaEmail" buttonLabel="Get Early Access" />
        </div>
        <p
          className={`${styles.formNote} ${styles.reveal} ${styles.d2}`}
          data-reveal
          data-reveal-visible-class={styles.revealVisible}
        >
          No credit card. No spam. Cancel anytime.
        </p>
        </div>
      </div>
    </div>
  );
}
