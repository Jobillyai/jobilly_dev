import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AbstractBackground } from "@/components/layout/abstract-background";
import { SITE_LEGAL_NAME, SITE_SUPPORT_EMAIL } from "@/lib/seo/site";
import shell from "./marketing-shell.module.css";
import styles from "./about-page.module.css";

const PILLARS = [
  {
    title: "Career advisory",
    body: "Free guidance that clarifies your target roles, resume gaps, and a practical path from campus to interviews.",
  },
  {
    title: "AI mock interviews",
    body: "Voice practice styled after real company interviewers, with scored feedback so you improve before the real round.",
  },
  {
    title: "Managed applications",
    body: "A human team searches matched roles on Indeed and LinkedIn, prepares materials, applies with oversight, and tracks every submission.",
  },
] as const;

export function AboutPage() {
  return (
    <div className={shell.page}>
      <section className={shell.hero}>
        <AbstractBackground />
        <div className={shell.heroContent}>
          <div className={shell.heroInner}>
            <p className={shell.heroEyebrow}>About Jobilly</p>
            <h1 className={shell.heroTitle}>
              From graduation to{" "}
              <span className={shell.brandWord}>your first job</span>
            </h1>
            <p className={shell.heroSub}>
              Jobilly.ai is built for fresh graduates who need more than a job board —
              clear advice, interview practice, and optional help applying to roles that
              match their background.
            </p>
            <div className={shell.heroActions}>
              <Link href="/signup" className={shell.btnPrimary}>
                Get started
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/products" className={shell.btnSecondary}>
                View plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`${shell.section} ${shell.sectionMuted}`}>
        <div className={shell.sectionContent}>
          <p className={shell.sectionLabel}>Our mission</p>
          <h2 className={shell.sectionTitle}>Close the gap after graduation</h2>
          <div className={styles.prose}>
            <p>
              Landing a first role is hard when you are competing without a network,
              polished interview reps, or time to apply everywhere. Jobilly combines AI
              tools with a human team so graduates get structure — not another generic
              checklist.
            </p>
            <p>
              We operate as {SITE_LEGAL_NAME}. Our focus is early-career candidates who
              want advisory, practice, and application support in one place.
            </p>
          </div>
        </div>
      </section>

      <section className={shell.section}>
        <div className={shell.sectionContent}>
          <p className={shell.sectionLabel}>What we offer</p>
          <h2 className={shell.sectionTitle}>Three ways we help you get hired</h2>
          <div className={styles.pillarGrid}>
            {PILLARS.map((pillar) => (
              <article key={pillar.title} className={styles.pillar}>
                <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                <p className={styles.pillarBody}>{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${shell.section} ${shell.sectionMuted}`}>
        <div className={shell.sectionContent}>
          <p className={shell.sectionLabel}>How we work</p>
          <h2 className={shell.sectionTitle}>AI speed, human judgment</h2>
          <div className={styles.prose}>
            <p>
              Automation helps with matching, practice, and drafting. People review
              applications, coach where it matters, and keep candidates in the loop
              through the portal — so you always know what was sent and what comes next.
            </p>
            <p>
              Questions about the company or partnership? Email{" "}
              <a href={`mailto:${SITE_SUPPORT_EMAIL}`}>{SITE_SUPPORT_EMAIL}</a> or use
              our contact form.
            </p>
          </div>
        </div>
      </section>

      <section className={shell.ctaSection}>
        <div className={shell.sectionContent}>
          <div className={shell.ctaInner}>
            <h2 className={shell.ctaTitle}>Ready for your next step?</h2>
            <p className={shell.ctaSub}>
              Book free career advisory, explore plans, or ask us anything — we will
              point you to the right starting point.
            </p>
            <div className={shell.ctaActions}>
              <Link href="/contact" className={shell.btnPrimary}>
                Contact us
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/faq" className={shell.btnSecondary}>
                Read FAQs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
