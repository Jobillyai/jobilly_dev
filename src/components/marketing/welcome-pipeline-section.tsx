"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Compass,
  FileText,
  ListChecks,
  Loader2,
  Mail,
  Search,
} from "lucide-react";
import styles from "./welcome-pipeline-section.module.css";
import revealStyles from "./welcome-reveal.module.css";

type PipelineStageId = "discover" | "prepare" | "apply" | "track";

type PipelineStage = {
  id: PipelineStageId;
  step: string;
  slug: string;
  title: string;
  headline: string;
  description: string;
};

const stages: PipelineStage[] = [
  {
    id: "discover",
    step: "01",
    slug: "find",
    title: "Discover",
    headline: "Find your direction before the hunt.",
    description:
      "Book free career advisory, map your target roles, and see matched openings on Indeed and LinkedIn — so every application starts with clarity.",
  },
  {
    id: "prepare",
    step: "02",
    slug: "prep",
    title: "Prepare",
    headline: "A résumé rewritten for each role.",
    description:
      "Your profile lives in one hub. Jobilly tailors materials per application — keyword-aligned, ATS-safe, and reviewed by your mentor before anything goes out.",
  },
  {
    id: "apply",
    step: "03",
    slug: "apply",
    title: "Apply",
    headline: "We search. We submit. You stay in control.",
    description:
      "Our team searches matched roles and applies on your behalf — every field filled, résumé uploaded, and open-ended answers written in your voice.",
  },
  {
    id: "track",
    step: "04",
    slug: "track",
    title: "Track",
    headline: "Every application, one calm pipeline.",
    description:
      "Submitted, tailoring, interview, reply — every status lands in your candidate portal so your inbox stops being a graveyard of threads.",
  },
];

const scanLines = [
  "[00:00:01] scanning amazon.jobs… +1 new",
  "[00:00:02] scanning careers.google.com… +1 new",
  "[00:00:03] scanning careers.airbnb.com… 0 new",
  "[00:00:04] jobs.sap.com · Cloud Consultant · MATCH 91%",
];

const resumeChanges = [
  {
    before: "Built features for the web app using React.",
    after: "Shipped React + TypeScript surfaces serving 4M MAU; cut p95 render time 38%.",
  },
  {
    before: "Worked with the product team on improvements.",
    after: "Drove the platform roadmap with PMs across three product pods.",
  },
];

const applyFields = [
  "Full name",
  "Email",
  "LinkedIn",
  "Résumé upload",
  "Work authorization",
  "Why this company?",
];

const trackerRows = [
  { company: "Google", role: "Software Engineer", status: "Submitted", tone: "green" as const },
  { company: "Amazon", role: "SDE II", status: "Tailoring résumé", tone: "blue" as const },
  { company: "Airbnb", role: "Frontend Developer", status: "Interview", tone: "amber" as const },
  { company: "SAP", role: "Cloud Consultant", status: "Queued", tone: "muted" as const },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const handler = () => setReduced(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function DiscoverPreview({ active }: { active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [lineIndex, setLineIndex] = useState(reduced ? scanLines.length - 1 : 0);

  useEffect(() => {
    if (!active || reduced) {
      if (reduced) setLineIndex(scanLines.length - 1);
      return;
    }

    setLineIndex(0);
    const timer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % scanLines.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [active, reduced]);

  return (
    <div className={styles.previewStack}>
      <div className={styles.terminal}>
        {scanLines.slice(0, lineIndex + 1).map((line) => (
          <p key={line} className={styles.terminalLine}>
            {line}
          </p>
        ))}
        {!reduced ? <span className={styles.terminalCursor} aria-hidden /> : null}
      </div>
      <div className={styles.matchCard}>
        <div className={styles.matchCardTop}>
          <Search size={14} />
          <span>Role match found</span>
        </div>
        <p className={styles.matchCardTitle}>Software Engineer · Google</p>
        <p className={styles.matchCardMeta}>94% fit · Added to your queue</p>
      </div>
    </div>
  );
}

function PreparePreview({ active }: { active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [visibleChanges, setVisibleChanges] = useState(reduced ? resumeChanges.length : 0);

  useEffect(() => {
    if (!active || reduced) {
      if (reduced) setVisibleChanges(resumeChanges.length);
      return;
    }

    setVisibleChanges(0);
    const timer = window.setInterval(() => {
      setVisibleChanges((current) =>
        current >= resumeChanges.length ? resumeChanges.length : current + 1,
      );
    }, 1400);
    return () => window.clearInterval(timer);
  }, [active, reduced]);

  return (
    <div className={styles.previewStack}>
      <p className={styles.previewLabel}>Résumé tailoring · per role</p>
      <ul className={styles.resumeList}>
        {resumeChanges.map((change, index) => (
          <li
            key={change.before}
            className={`${styles.resumeItem} ${
              index < visibleChanges ? styles.resumeItemVisible : ""
            }`}
          >
            <p className={styles.resumeBefore}>
              <span className={styles.resumeMark}>−</span>
              {change.before}
            </p>
            {index < visibleChanges ? (
              <p className={styles.resumeAfter}>
                <span className={styles.resumeMark}>+</span>
                {change.after}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className={styles.previewFooter}>
        4 changes <span className={styles.previewFooterMuted}>· reviewed before send</span>
      </p>
    </div>
  );
}

function ApplyPreview({ active }: { active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [filledCount, setFilledCount] = useState(reduced ? applyFields.length : 0);

  useEffect(() => {
    if (!active || reduced) {
      if (reduced) setFilledCount(applyFields.length);
      return;
    }

    setFilledCount(0);
    const timer = window.setInterval(() => {
      setFilledCount((current) =>
        current >= applyFields.length ? 0 : current + 1,
      );
    }, 1100);
    return () => window.clearInterval(timer);
  }, [active, reduced]);

  const isComplete = filledCount >= applyFields.length;

  return (
    <div className={styles.previewStack}>
      <div className={styles.applyReceiptHeader}>
        <Briefcase size={14} />
        <span>{isComplete ? "Application submitted" : "Preparing application…"}</span>
      </div>
      <p className={styles.applyReceiptRole}>
        SDE II · <strong>Amazon</strong>
      </p>
      <ul className={styles.applyReceiptList}>
        {applyFields.map((field, index) => {
          const done = index < filledCount;
          const loading = index === filledCount && !isComplete;

          return (
            <li
              key={field}
              className={`${styles.applyReceiptRow} ${done ? styles.applyReceiptRowDone : ""} ${
                loading ? styles.applyReceiptRowActive : ""
              }`}
            >
              <span className={styles.applyReceiptCheck}>
                {done ? (
                  <CheckCircle2 size={13} />
                ) : loading ? (
                  <Loader2 size={13} className={styles.spin} />
                ) : (
                  <span className={styles.applyReceiptDot} />
                )}
              </span>
              <span>{field}</span>
            </li>
          );
        })}
      </ul>
      <p className={styles.applyReceiptMeta}>
        {isComplete
          ? "6 of 6 fields · submitted via Jobilly team"
          : `${filledCount} of ${applyFields.length} fields · filling form…`}
      </p>
    </div>
  );
}

function TrackPreview({ active }: { active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [showNote, setShowNote] = useState(reduced);

  useEffect(() => {
    if (!active) {
      setShowNote(reduced);
      return;
    }
    if (reduced) {
      setShowNote(true);
      return;
    }
    setShowNote(false);
    const timer = window.setTimeout(() => setShowNote(true), 1800);
    return () => window.clearTimeout(timer);
  }, [active, reduced]);

  return (
    <div className={styles.previewStack}>
      <div className={styles.trackerStats}>
        <div className={styles.trackerStat}>
          <span className={styles.trackerStatValue}>12</span>
          <span className={styles.trackerStatLabel}>Applied</span>
        </div>
        <div className={styles.trackerStat}>
          <span className={styles.trackerStatValue}>4</span>
          <span className={styles.trackerStatLabel}>Interview</span>
        </div>
        <div className={styles.trackerStat}>
          <span className={styles.trackerStatValue}>2</span>
          <span className={styles.trackerStatLabel}>Replies</span>
        </div>
      </div>
      <ul className={styles.trackerList}>
        {trackerRows.map((row) => (
          <li key={row.company} className={styles.trackerRow}>
            <div>
              <p className={styles.trackerCompany}>{row.company}</p>
              <p className={styles.trackerRole}>{row.role}</p>
            </div>
            <span className={`${styles.trackerStatus} ${styles[`trackerStatus_${row.tone}`]}`}>
              {row.status}
            </span>
          </li>
        ))}
      </ul>
      <p className={`${styles.trackerNote} ${showNote ? styles.trackerNoteVisible : ""}`}>
        <Mail size={12} />
        Recruiter replies routed to the right application automatically.
      </p>
    </div>
  );
}

const stageIcons: Record<PipelineStageId, typeof Compass> = {
  discover: Compass,
  prepare: FileText,
  apply: Briefcase,
  track: ListChecks,
};

function StagePreview({
  stageId,
  active,
}: {
  stageId: PipelineStageId;
  active: boolean;
}) {
  switch (stageId) {
    case "discover":
      return <DiscoverPreview active={active} />;
    case "prepare":
      return <PreparePreview active={active} />;
    case "apply":
      return <ApplyPreview active={active} />;
    case "track":
      return <TrackPreview active={active} />;
  }
}

const STAGE_INTERVAL_MS = 5000;

export function WelcomePipelineSection() {
  const [activeStage, setActiveStage] = useState<PipelineStageId>("discover");
  const [isPaused, setIsPaused] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  const nextStage = useCallback(() => {
    setActiveStage((current) => {
      const index = stages.findIndex((stage) => stage.id === current);
      const next = stages[(index + 1) % stages.length];
      return next?.id ?? "discover";
    });
  }, []);

  useEffect(() => {
    if (reduced) {
      setHasRevealed(true);
      return;
    }

    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (isPaused || reduced) return;

    const timer = window.setInterval(nextStage, STAGE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, reduced, nextStage]);

  const current: PipelineStage = stages.find((s) => s.id === activeStage) ?? stages[0]!;
  const revealed = hasRevealed ? "revealed" : "";

  return (
    <section id="pipeline" ref={sectionRef} className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>The pipeline</p>
          <h2
            className={`${styles.title} ${revealStyles.revealFromRight} ${revealed}`}
          >
            Clarity at every step.
            <br />
            <span className={styles.titleAccent}>One portal for the whole hunt.</span>
          </h2>
          <div
            className={`${styles.stageFlow} ${revealStyles.revealFromLeft} ${revealed}`}
          >
            {stages.map((stage, index) => (
              <span
                key={stage.id}
                className={`${styles.stageFlowItem} ${
                  stage.id === activeStage ? styles.stageFlowItemActive : ""
                }`}
              >
                <span className={styles.stageFlowStep}>{stage.step}</span>
                <span className={styles.stageFlowLabel}>{stage.title}</span>
                {index < stages.length - 1 ? (
                  <span className={styles.stageFlowArrow} aria-hidden>
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <p className={styles.lead}>
            Advisory, tailored résumés, managed applications, and live tracking — discover
            your path, prep your materials, apply with our team, and watch every submission
            land in one calm workspace.
          </p>
        </div>

        <div
          className={styles.stageInteractive}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsPaused(false);
            }
          }}
        >
        <div className={styles.stageTabs} role="tablist" aria-label="Career pipeline stages">
          {stages.map((stage, index) => {
            const Icon = stageIcons[stage.id];
            const isActive = stage.id === activeStage;

            return (
              <div
                key={stage.id}
                className={`${styles.stageTabReveal} ${
                  index % 2 === 0 ? revealStyles.revealFromLeft : revealStyles.revealFromRight
                } ${revealed}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.stageTab} ${isActive ? styles.stageTabActive : ""}`}
                  onClick={() => setActiveStage(stage.id)}
                >
                  <span className={styles.stageTabStep}>
                    {stage.step} · {stage.slug}
                  </span>
                  <span className={styles.stageTabLabel}>
                    <Icon size={14} aria-hidden />
                    {stage.title}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className={styles.stageLayout}>
          <div className={styles.stageCopy}>
            {stages.map((stage) => {
              const Icon = stageIcons[stage.id];
              const isActive = stage.id === activeStage;

              return (
                <div
                  key={stage.id}
                  className={`${styles.copyPane} ${isActive ? styles.copyPaneActive : ""}`}
                  aria-hidden={!isActive}
                >
                  <div className={styles.stageCopyHeader}>
                    <span className={styles.stageStep}>
                      {stage.step} · {stage.slug}
                    </span>
                    <Icon size={18} className={styles.stageIcon} aria-hidden />
                  </div>
                  <h3 className={styles.stageHeadline}>{stage.headline}</h3>
                  <p className={styles.stageDescription}>{stage.description}</p>
                  <Link href="/signup" className={styles.stageCta}>
                    Get started
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </div>
              );
            })}
          </div>

          <div
            className={styles.stagePreview}
            role="tabpanel"
            aria-label={`${current.title} preview`}
          >
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={`${styles.previewPane} ${
                  stage.id === activeStage ? styles.previewPaneActive : ""
                }`}
                aria-hidden={stage.id !== activeStage}
              >
                <StagePreview stageId={stage.id} active={stage.id === activeStage} />
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
