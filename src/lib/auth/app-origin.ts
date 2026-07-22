import { headers } from "next/headers";
import { SITE_URL } from "@/lib/seo/site";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalHost(host: string): boolean {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

function isVercelAppHost(hostOrUrl: string): boolean {
  try {
    const host = hostOrUrl.includes("://")
      ? new URL(hostOrUrl).host
      : hostOrUrl.split(":")[0] ?? hostOrUrl;
    return host.endsWith(".vercel.app");
  } catch {
    return hostOrUrl.includes(".vercel.app");
  }
}

function originFromHost(
  host: string | null,
  proto: string | null,
  fallback: string,
): string {
  if (!host) {
    return fallback;
  }

  const protocol =
    proto ?? (isLocalHost(host) ? "http" : "https");

  return `${protocol}://${host}`;
}

/**
 * Public site origin for auth emails, OAuth, and post-login redirects.
 * Never sends users to *.vercel.app when a real domain is configured.
 */
export function getPublicAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    const normalized = stripTrailingSlash(fromEnv);
    if (!isVercelAppHost(normalized)) {
      return normalized;
    }
  }

  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return SITE_URL;
  }

  return "http://localhost:3000";
}

function resolveOriginFromHostHeaders(
  hostHeader: string | null,
  proto: string | null,
): string {
  const host = hostHeader?.split(",")[0]?.trim() || null;
  const publicOrigin = getPublicAppOrigin();

  if (!host) {
    return publicOrigin;
  }

  // Custom / local host wins; never keep users on the Vercel deployment hostname.
  if (isVercelAppHost(host)) {
    return publicOrigin;
  }

  return originFromHost(host, proto, publicOrigin);
}

export function getOriginFromRequest(request: Request): string {
  return resolveOriginFromHostHeaders(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get("x-forwarded-proto"),
  );
}

export async function getRequestAppOrigin(): Promise<string> {
  const headersList = await headers();

  return resolveOriginFromHostHeaders(
    headersList.get("x-forwarded-host") ?? headersList.get("host"),
    headersList.get("x-forwarded-proto"),
  );
}
