"use client";

import { useEffect, useState } from "react";
import { Briefcase, Compass, FileText, ListChecks } from "lucide-react";
import styles from "./welcome-pipeline-hero-card.module.css";

const pipelineNodes = [
  {
    id: "discover",
    step: "01",
    label: "Discover",
    icon: Compass,
    detail: "Free advisory + matched roles",
    metric: "94% fit",
  },
  {
    id: "prepare",
    step: "02",
    label: "Prepare",
    icon: FileText,
    detail: "Application resume per role",
    metric: "Reviewed",
  },
  {
    id: "apply",
    step: "03",
    label: "Apply",
    icon: Briefcase,
    detail: "Team submits on your behalf",
    metric: "6/6 fields",
  },
  {
    id: "track",
    step: "04",
    label: "Track",
    icon: ListChecks,
    detail: "Every status in one pipeline",
    metric: "12 active",
  },
] as const;

const companies = ["Google", "Amazon", "Airbnb", "SAP"];

const CYCLE_MS = 2800;

export function WelcomePipelineHeroCard() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % pipelineNodes.length);
    }, CYCLE_MS);

    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const active = pipelineNodes[activeIndex] ?? pipelineNodes[0];
  const ActiveIcon = active.icon;
  const progress = ((activeIndex + 1) / pipelineNodes.length) * 100;

  return (
    <div className={styles.card} aria-hidden>
      <div className={styles.glow} />
      <div className={styles.cardInner}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Pipeline map</h3>
          <span className={styles.livePill}>Live</span>
        </div>

        <div className={styles.cardSection}>
          <div className={styles.orbitWrap}>
            <div className={styles.orbitRing} />
            <div className={styles.orbitHub}>
              <span className={styles.orbitHubStep}>{active.step}</span>
              <ActiveIcon size={20} className={styles.orbitHubIcon} />
              <span className={styles.orbitHubLabel}>{active.label}</span>
            </div>

            {pipelineNodes.map((node, index) => {
              const Icon = node.icon;
              const isActive = index === activeIndex;

              return (
                <div
                  key={node.id}
                  className={`${styles.orbitNode} ${styles[`orbitNode_${index}`]} ${
                    isActive ? styles.orbitNodeActive : ""
                  }`}
                >
                  <span className={styles.orbitNodeIcon}>
                    <Icon size={14} />
                  </span>
                  <span className={styles.orbitNodeLabel}>{node.label}</span>
                </div>
              );
            })}

            <div
              className={styles.orbitPulse}
              style={{
                transform: `rotate(${activeIndex * 90}deg)`,
                transitionDuration: reducedMotion ? "0ms" : "600ms",
              }}
            />
          </div>
        </div>

        <div className={styles.cardSection}>
          <div className={styles.track}>
            <div className={styles.trackLine}>
              <div
                className={styles.trackFill}
                style={{
                  width: `${progress}%`,
                  transitionDuration: reducedMotion ? "0ms" : "600ms",
                }}
              />
            </div>
            <div className={styles.trackNodes}>
              {pipelineNodes.map((node, index) => (
                <span
                  key={node.id}
                  className={`${styles.trackDot} ${
                    index <= activeIndex ? styles.trackDotDone : ""
                  } ${index === activeIndex ? styles.trackDotActive : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.cardSection}>
          <p className={styles.stageEyebrow}>Now in stage {active.step}</p>
          <div className={styles.stageRow}>
            <p className={styles.stageText}>{active.detail}</p>
            <span className={styles.stageMetric}>{active.metric}</span>
          </div>
        </div>

        <div className={`${styles.cardSection} ${styles.cardSectionLast}`}>
          <p className={styles.companyLabel}>Targeting</p>
          <div className={styles.companyList}>
            {companies.map((company) => (
              <span key={company} className={styles.companyChip}>
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
