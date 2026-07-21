import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AbstractBackground } from "@/components/layout/abstract-background";
import { SITE_FAQS } from "@/lib/seo/site";
import shell from "./marketing-shell.module.css";
import styles from "./faq-page.module.css";

export function FaqPage() {
  return (
    <div className={shell.page}>
      <section className={shell.hero}>
        <AbstractBackground />
        <div className={shell.heroContent}>
          <div className={shell.heroInner}>
            <p className={shell.heroEyebrow}>FAQ</p>
            <h1 className={shell.heroTitle}>
              Questions graduates{" "}
              <span className={shell.brandWord}>ask us</span>
            </h1>
            <p className={shell.heroSub}>
              Straight answers about career advisory, AI mock interviews, managed job
              applications, and pricing.
            </p>
            <div className={shell.heroActions}>
              <Link href="/contact" className={shell.btnPrimary}>
                Still have a question?
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/products" className={shell.btnSecondary}>
                Compare plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${shell.section} ${shell.sectionMuted}`}
        id="faq"
        aria-labelledby="faq-page-heading"
      >
        <div className={shell.sectionContent}>
          <h2 id="faq-page-heading" className={shell.sectionTitle}>
            Frequently asked questions
          </h2>
          <div className={styles.faqList}>
            {SITE_FAQS.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>{item.question}</summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={shell.ctaSection}>
        <div className={shell.sectionContent}>
          <div className={shell.ctaInner}>
            <h2 className={shell.ctaTitle}>Need a human answer?</h2>
            <p className={shell.ctaSub}>
              Tell us what you are trying to do — advisory, interviews, or applications —
              and we will reply with next steps.
            </p>
            <div className={shell.ctaActions}>
              <Link href="/contact" className={shell.btnPrimary}>
                Contact us
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/about" className={shell.btnSecondary}>
                About Jobilly
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
