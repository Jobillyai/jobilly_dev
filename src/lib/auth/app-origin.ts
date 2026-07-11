import { headers } from "next/headers";

function originFromHost(
  host: string | null,
  proto: string | null,
  fallback: string,
): string {
  if (!host) {
    return fallback;
  }

  const protocol =
    proto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

export function getOriginFromRequest(request: Request): string {
  const fallback =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  return originFromHost(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get("x-forwarded-proto"),
    fallback,
  );
}

export async function getRequestAppOrigin(): Promise<string> {
  const fallback =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const headersList = await headers();

  return originFromHost(
    headersList.get("x-forwarded-host") ?? headersList.get("host"),
    headersList.get("x-forwarded-proto"),
    fallback,
  );
}
