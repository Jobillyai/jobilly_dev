"use client";

import { useEffect, useState } from "react";
import {
  BOTTOM_ROW_COMPANY_IDS,
  companyLogos,
  TOP_ROW_COMPANY_IDS,
  type CompanyLogo,
} from "./company-logos";
import styles from "./companies-marquee.module.css";

function CompanyLogoIcon({ company }: { company: CompanyLogo }) {
  const brandStyle = { "--logo-brand": `#${company.hex}` } as React.CSSProperties;

  if (!company.path) {
    return (
      <span className={styles.logoFallback} style={brandStyle} aria-hidden="true">
        {company.title.charAt(0)}
      </span>
    );
  }

  return (
    <svg
      className={styles.logoSvg}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      style={brandStyle}
    >
      <path d={company.path} fill="currentColor" />
    </svg>
  );
}

function LogoItem({ company, hidden }: { company: CompanyLogo; hidden?: boolean }) {
  return (
    <li
      className={styles.logoItem}
      style={{ "--logo-brand": `#${company.hex}` } as React.CSSProperties}
      aria-hidden={hidden || undefined}
    >
      <div className={styles.logoCard}>
        <CompanyLogoIcon company={company} />
        <span className={styles.logoName}>{company.title}</span>
      </div>
    </li>
  );
}

function MarqueeRow({
  ids,
  direction,
  reducedMotion,
}: {
  ids: readonly string[];
  direction: "left" | "right";
  reducedMotion: boolean;
}) {
  const items = reducedMotion
    ? ids.map((id) => ({ id, hidden: false }))
    : [
        ...ids.map((id) => ({ id, hidden: false })),
        ...ids.map((id) => ({ id, hidden: true })),
      ];

  return (
    <div className={styles.track}>
      <ul
        className={`${styles.trackInner} ${
          reducedMotion
            ? styles.trackStatic
            : direction === "left"
              ? styles.scrollLeft
              : styles.scrollRight
        }`}
        aria-label={`Company logos scrolling ${direction}`}
      >
        {items.map(({ id, hidden }, index) => (
          <LogoItem key={`${id}-${index}`} company={companyLogos[id]!} hidden={hidden} />
        ))}
      </ul>
    </div>
  );
}

export function CompaniesMarquee() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => setReducedMotion(media.matches);

    applyPreference();
    media.addEventListener("change", applyPreference);
    return () => media.removeEventListener("change", applyPreference);
  }, []);

  return (
    <section className={styles.marquee} aria-labelledby="companies-marquee-label">
      <p id="companies-marquee-label" className={styles.label}>
        Practice interviewing for roles at
      </p>

      <div className={styles.rows}>
        <MarqueeRow ids={TOP_ROW_COMPANY_IDS} direction="left" reducedMotion={reducedMotion} />
        <MarqueeRow ids={BOTTOM_ROW_COMPANY_IDS} direction="right" reducedMotion={reducedMotion} />
      </div>
    </section>
  );
}
