"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { JobillyLoader } from "./jobilly-loader";
import styles from "./route-loader.module.css";

function isInternalNavigationLink(anchor: HTMLAnchorElement) {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function RouteLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPathRef = useRef(pathname);

  function clearTimers() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }

  function startLoading() {
    clearTimers();
    setLoading(true);

    // Never block the UI indefinitely if navigation or a redirect fails.
    safetyTimerRef.current = setTimeout(() => {
      setLoading(false);
      safetyTimerRef.current = null;
    }, 12000);
  }

  function stopLoading(delay = 350) {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setLoading(false);
      hideTimerRef.current = null;
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    }, delay);
  }

  useEffect(() => {
    if (pathname !== previousPathRef.current) {
      previousPathRef.current = pathname;
      stopLoading();
    }
  }, [pathname]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!anchor || !isInternalNavigationLink(anchor)) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.origin);
      if (nextUrl.pathname !== pathname) {
        startLoading();
      }
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      clearTimers();
    };
  }, [pathname]);

  if (!loading) {
    return null;
  }

  return (
    <>
      <div className={styles.routeLoaderBar} aria-hidden>
        <div className={styles.routeLoaderBarInner} />
      </div>
      <div className={styles.routeLoaderOverlay} aria-live="polite" aria-busy="true">
        <JobillyLoader variant="default" size="md" />
      </div>
    </>
  );
}
