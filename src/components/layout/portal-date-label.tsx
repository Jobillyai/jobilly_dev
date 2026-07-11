"use client";

import { useEffect, useState } from "react";
import { getPortalZoneSnapshots } from "@/lib/portal-datetime";
import styles from "./portal-date-label.module.css";

type PortalDateLabelProps = {
  className?: string;
  variant?: "portal" | "admin";
};

export function PortalDateLabel({ className, variant = "portal" }: PortalDateLabelProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const zones = getPortalZoneSnapshots(now);

  const rootClass = [
    styles.root,
    variant === "admin" ? styles.admin : styles.portal,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} aria-label="Current date and time in India and United States">
      <div className={styles.grid}>
        {zones.map((zone) => (
          <article key={zone.label} className={styles.card}>
            <div className={styles.meta}>
              <span className={styles.region}>{zone.region}</span>
              <span className={styles.badge}>{zone.label}</span>
            </div>
            <div className={styles.details}>
              <span className={styles.weekday}>{zone.weekday}</span>
              <span className={styles.sep} aria-hidden>
                ·
              </span>
              <span className={styles.date}>{zone.date}</span>
            </div>
            <time className={styles.time} dateTime={now.toISOString()}>
              {zone.time}
            </time>
          </article>
        ))}
      </div>
    </div>
  );
}
