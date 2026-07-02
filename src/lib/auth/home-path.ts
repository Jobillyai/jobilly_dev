import { isAdminPortalRole } from "@/lib/auth/roles";

export type AuthenticatedHomePath = "/dashboard" | "/admin";

export const MARKETING_ROUTES = [
  "/",
  "/products",
  "/communities",
  "/contact",
] as const;

export type MarketingRoute = (typeof MARKETING_ROUTES)[number];

export function isMarketingRoute(pathname: string): boolean {
  return MARKETING_ROUTES.some((route) => route === pathname);
}

export function getAuthenticatedHomePath(
  role: string | null | undefined,
): AuthenticatedHomePath {
  return isAdminPortalRole(role) ? "/admin" : "/dashboard";
}

export function getMarketingHomePath(options: {
  isLoggedIn: boolean;
  role?: string | null;
}): "/" | AuthenticatedHomePath {
  if (!options.isLoggedIn) {
    return "/";
  }
  return getAuthenticatedHomePath(options.role);
}
