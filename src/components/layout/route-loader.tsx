"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ROUTE_LOADING_START } from "@/lib/route-loading";
import { LoadingOverlay } from "./loading-overlay";
import styles from "./route-loader.module.css";

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

    // Hash-only changes on the current page are not route navigations.
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

    safetyTimerRef.current = setTimeout(() => {
      setLoading(false);
      safetyTimerRef.current = null;
    }, 12000);
  }

  function stopLoading(delay = 120) {
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
    function handleRouteLoadingStart() {
      startLoading();
    }

    window.addEventListener(ROUTE_LOADING_START, handleRouteLoadingStart);

    return () => {
      window.removeEventListener(ROUTE_LOADING_START, handleRouteLoadingStart);
    };
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
      className={`${styles.routeLoaderRoot} ${loading ? styles.routeLoaderVisible : ""}`}
      aria-hidden={!loading}
      aria-busy={loading}
    >
      {loading ? <LoadingOverlay /> : null}
    </div>
  );
}
