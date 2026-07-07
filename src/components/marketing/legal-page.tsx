import Link from "next/link";
import { AbstractBackground } from "@/components/layout/abstract-background";
import authStyles from "@/components/auth/auth-page.module.css";
import type { LegalDocument } from "@/lib/legal/content";
import styles from "./legal-page.module.css";

type LegalPageProps = {
  document: LegalDocument;
  backHref?: "/" | "/dashboard" | "/admin";
  backLabel?: string;
  siblingHref?: "/privacy" | "/terms";
  siblingLabel?: string;
};

export function LegalPage({
  document,
  backHref = "/",
  backLabel = "Back to home",
  siblingHref,
  siblingLabel,
}: LegalPageProps) {
  return (
    <div className={styles.page}>
      <AbstractBackground className={styles.background} />
      <div className={styles.inner}>
        <div className={styles.header}>
          <Link href={backHref} className={authStyles.backLink}>
            ← {backLabel}
          </Link>
          <h1 className={styles.title}>
            {document.title}{" "}
            <em className={styles.titleEm}>{document.titleEm}</em>
          </h1>
          <p className={styles.subtitle}>{document.subtitle}</p>
          <p className={styles.meta}>Effective {document.effectiveDate}</p>
        </div>

        <article className={styles.content}>
          {document.sections.map((section) => (
            <section key={section.id} className={styles.section}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <div className={styles.prose}>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.id}-${index}`} className={styles.paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {siblingHref && siblingLabel ? (
            <div className={styles.footerLinks}>
              <Link href={siblingHref}>{siblingLabel}</Link>
              <Link href="/contact">Contact us</Link>
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
