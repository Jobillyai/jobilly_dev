"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { asAppRoute } from "@/lib/app-route";

export function usePrefetchRoutes(routes: readonly string[]) {
  const router = useRouter();
  const routesKey = routes.join("\0");

  useEffect(() => {
    for (const route of routes) {
      router.prefetch(asAppRoute(route));
    }
  }, [router, routes, routesKey]);
}
