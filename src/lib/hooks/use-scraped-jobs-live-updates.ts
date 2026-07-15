"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/server/db/supabase-browser";
import { normalizeSearchRole } from "@/lib/normalize-search-role";

const REFRESH_DEBOUNCE_MS = 400;
const BACKOFF_INTERVALS_MS = [10_000, 15_000, 20_000, 30_000] as const;
const DISCONNECTED_FALLBACK_MS = 30_000;

type ScrapedJobChangeRow = {
  search_role?: string | null;
};

type UseScrapedJobsLiveUpdatesOptions = {
  candidateId: string;
  /** When set, only react to rows for this interested role. */
  searchRole?: string | null;
  enabled?: boolean;
  /** During an active scrape, run slower backoff polls if Realtime is unavailable. */
  scrapeActive?: boolean;
  onRefresh: () => void | Promise<void>;
};

function rowMatchesSearchRole(
  row: ScrapedJobChangeRow | undefined,
  normalizedRole: string | null,
): boolean {
  if (!normalizedRole) {
    return true;
  }

  if (!row?.search_role) {
    return true;
  }

  return normalizeSearchRole(row.search_role) === normalizedRole;
}

export function useScrapedJobsLiveUpdates({
  candidateId,
  searchRole,
  enabled = true,
  scrapeActive = false,
  onRefresh,
}: UseScrapedJobsLiveUpdatesOptions) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const normalizedRole = searchRole?.trim()
    ? normalizeSearchRole(searchRole)
    : null;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffIndexRef = useRef(0);
  const realtimeConnectedRef = useRef(false);
  /** Once unmounted, no timer may be (re)scheduled — otherwise pollers leak. */
  const disposedRef = useRef(false);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const clearBackoff = useCallback(() => {
    if (backoffRef.current) {
      clearTimeout(backoffRef.current);
      backoffRef.current = null;
    }
    backoffIndexRef.current = 0;
  }, []);

  const clearFallback = useCallback(() => {
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    if (disposedRef.current) {
      return;
    }

    clearDebounce();
    debounceRef.current = setTimeout(() => {
      void Promise.resolve(onRefreshRef.current()).catch((error) => {
        console.error("scraped jobs refresh failed:", error);
      });
    }, REFRESH_DEBOUNCE_MS);
  }, [clearDebounce]);

  const scheduleBackoffPoll = useCallback(() => {
    if (disposedRef.current || !scrapeActive || realtimeConnectedRef.current) {
      return;
    }

    clearBackoff();
    const delay =
      BACKOFF_INTERVALS_MS[
        Math.min(backoffIndexRef.current, BACKOFF_INTERVALS_MS.length - 1)
      ];
    backoffIndexRef.current = Math.min(
      backoffIndexRef.current + 1,
      BACKOFF_INTERVALS_MS.length - 1,
    );

    backoffRef.current = setTimeout(() => {
      if (disposedRef.current) {
        return;
      }
      void Promise.resolve(onRefreshRef.current())
        .catch((error) => {
          console.error("scraped jobs backoff poll failed:", error);
        })
        .finally(() => {
          scheduleBackoffPoll();
        });
    }, delay);
  }, [clearBackoff, scrapeActive]);

  const scheduleDisconnectedFallback = useCallback(() => {
    if (disposedRef.current || realtimeConnectedRef.current) {
      return;
    }

    clearFallback();
    fallbackRef.current = setTimeout(() => {
      if (disposedRef.current) {
        return;
      }
      void Promise.resolve(onRefreshRef.current())
        .catch((error) => {
          console.error("scraped jobs fallback poll failed:", error);
        })
        .finally(() => {
          scheduleDisconnectedFallback();
        });
    }, DISCONNECTED_FALLBACK_MS);
  }, [clearFallback]);

  useEffect(() => {
    if (!enabled || !candidateId) {
      return;
    }

    disposedRef.current = false;
    const supabase = createClient();
    const channelName = `scraped_jobs:${candidateId}:${normalizedRole ?? "all"}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scraped_jobs",
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          const row =
            payload.eventType === "DELETE"
              ? (payload.old as ScrapedJobChangeRow)
              : (payload.new as ScrapedJobChangeRow);

          if (!rowMatchesSearchRole(row, normalizedRole)) {
            return;
          }

          triggerRefresh();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          realtimeConnectedRef.current = true;
          clearBackoff();
          clearFallback();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          realtimeConnectedRef.current = false;
          if (scrapeActive) {
            scheduleBackoffPoll();
          } else {
            scheduleDisconnectedFallback();
          }
        }
      });

    return () => {
      disposedRef.current = true;
      clearDebounce();
      clearBackoff();
      clearFallback();
      realtimeConnectedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [
    candidateId,
    normalizedRole,
    enabled,
    scrapeActive,
    triggerRefresh,
    clearDebounce,
    clearBackoff,
    clearFallback,
    scheduleBackoffPoll,
    scheduleDisconnectedFallback,
  ]);

  useEffect(() => {
    if (!enabled || !scrapeActive) {
      clearBackoff();
      return;
    }

    if (!realtimeConnectedRef.current) {
      scheduleBackoffPoll();
    }
  }, [enabled, scrapeActive, clearBackoff, scheduleBackoffPoll]);
}
