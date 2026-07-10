"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./welcome-hero-carousel.module.css";
import {
  ApplicationsHeroPreview,
  DashboardHeroPreview,
  GrowthLearningHeroPreview,
  MockInterviewHeroPreview,
} from "./welcome-hero-previews";

const SLIDE_INTERVAL_MS = 5000;
const TRANSITION_MS = 700;

const slides = [
  { id: "dashboard", label: "Dashboard", component: DashboardHeroPreview },
  { id: "applications", label: "Applications", component: ApplicationsHeroPreview },
  { id: "mock-interview", label: "Mock interview", component: MockInterviewHeroPreview },
  { id: "growth-learning", label: "Growth learning", component: GrowthLearningHeroPreview },
] as const;

export function WelcomeHeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveIndex(((index % slides.length) + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (isPaused || reducedMotion) return;

    const timer = window.setInterval(next, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, reducedMotion, next]);

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="Jobilly portal previews"
    >
      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{
            transform: `translate3d(-${activeIndex * 100}%, 0, 0)`,
            transitionDuration: reducedMotion ? "0ms" : `${TRANSITION_MS}ms`,
          }}
        >
          {slides.map((slide, index) => {
            const Preview = slide.component;
            return (
              <div
                key={slide.id}
                className={styles.slide}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
                aria-hidden={index !== activeIndex}
              >
                <Preview />
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.dots} role="tablist" aria-label="Select preview">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={slide.label}
            className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ""}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>

      <p className={styles.caption}>{slides[activeIndex]?.label}</p>
    </div>
  );
}
