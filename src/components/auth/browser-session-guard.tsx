"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  clearBrowserTabSession,
  hasDocumentCookie,
  TAB_SESSION_COOKIE_NAME,
} from "@/lib/auth/supabase-cookies";
import { createClient } from "@/server/db/supabase-browser";

/**
 * If auth cookies survived a full browser restart (e.g. from an old persistent
 * cookie or session restore), sign out so login is required again.
 */
export function BrowserSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      if (hasDocumentCookie(TAB_SESSION_COOKIE_NAME)) {
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      clearBrowserTabSession();
      await supabase.auth.signOut();
      router.refresh();
    })();
  }, [router]);

  return null;
}
