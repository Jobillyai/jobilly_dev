import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type AppRoute = Parameters<AppRouterInstance["push"]>[0];

export function asAppRoute(path: string): AppRoute {
  return path as AppRoute;
}
