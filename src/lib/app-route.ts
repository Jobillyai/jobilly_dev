import type { Route } from "next";

/** Cast a runtime path string to Next.js typed Route (typedRoutes experiment). */
export function asAppRoute(path: string): Route {
  return path as Route;
}
