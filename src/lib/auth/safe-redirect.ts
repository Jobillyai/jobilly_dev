/**
 * Validates same-origin relative redirect paths for auth callbacks.
 */
export function sanitizeInternalRedirectPath(
  path: string,
  fallback: string,
): string {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("@") ||
    path.includes("\0")
  ) {
    return fallback;
  }

  return path;
}
