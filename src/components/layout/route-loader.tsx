"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ROUTE_LOADING_START } from "@/lib/route-loading";
import styles from "./route-loader.module.css";

const SHOW_DELAY_MS = 120;

function isInternalNavigationLink(anchor: HTMLAnchorElement) {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  if (href.startsWith("#")) {
    return false;
  }

  try {
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin) {
      return false;
    }

    if (url.pathname === window.location.pathname && url.hash) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function RouteLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPathRef = useRef(pathname);

  function clearTimers() {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }

  function startLoading() {
    clearTimers();
    showTimerRef.current = setTimeout(() => {
      setActive(true);
      showTimerRef.current = null;
    }, SHOW_DELAY_MS);

    safetyTimerRef.current = setTimeout(() => {
      setActive(false);
      safetyTimerRef.current = null;
    }, 12000);
  }

  function stopLoading() {
    clearTimers();
    setActive(false);
  }

  useEffect(() => {
    if (pathname !== previousPathRef.current) {
      previousPathRef.current = pathname;
      stopLoading();
    }
  }, [pathname]);

  useEffect(() => {
    function handleRouteLoadingStart() {
      startLoading();
    }

    window.addEventListener(ROUTE_LOADING_START, handleRouteLoadingStart);
    return () => window.removeEventListener(ROUTE_LOADING_START, handleRouteLoadingStart);
  }, []);

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

  return (
    <div
      className={`${styles.progressTrack} ${active ? styles.progressActive : ""}`}
      aria-hidden={!active}
      aria-busy={active}
    >
      <div className={styles.progressBar} />
    </div>
  );
}
