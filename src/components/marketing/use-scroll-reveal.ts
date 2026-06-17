"use client";

import { useEffect, useRef } from "react";

/**
 * Ports the original vanilla-JS scroll-reveal behavior: observes every
 * element with a data-reveal attribute inside the returned ref's subtree,
 * and adds the corresponding "visible" class once it scrolls into view.
 * Mirrors the original threshold/rootMargin so the timing feels identical.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll<HTMLElement>("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const visibleClass = target.dataset.revealVisibleClass;
            if (visibleClass) target.classList.add(visibleClass);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return containerRef;
}
