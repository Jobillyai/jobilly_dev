"use client";

import { useEffect, useRef } from "react";

/**
 * Ports the original counter animation: when the returned ref's element
 * scrolls into view, every child with data-counter-target animates from 0
 * up to that target value over ~1.2s, then disconnects.
 */
export function useCounterAnimation<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function animateCounter(el: HTMLElement, target: number, duration = 1200) {
      let start: number | null = null;
      const step = (timestamp: number) => {
        if (start === null) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        el.textContent = String(Math.floor(progress * target));
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = String(target);
        }
      };
      requestAnimationFrame(step);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const counters =
              entry.target.querySelectorAll<HTMLElement>("[data-counter-target]");
            counters.forEach((counter) => {
              const target = parseInt(counter.dataset.counterTarget ?? "0", 10);
              animateCounter(counter, target);
            });
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return containerRef;
}
