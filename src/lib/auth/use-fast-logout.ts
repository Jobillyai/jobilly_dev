"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { startRouteLoading } from "@/lib/route-loading";
import { asAppRoute } from "@/lib/app-route";
import { createClient } from "@/server/db/supabase-browser";

export function useFastLogout(redirectTo: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const logout = useCallback(() => {
    startRouteLoading();
    startTransition(async () => {
      router.replace(asAppRoute(redirectTo));
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
    });
  }, [redirectTo, router]);

  return { logout, isPending };
}
