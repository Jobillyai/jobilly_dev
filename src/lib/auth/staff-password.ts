/** Staff must set a new password before using the rest of the admin portal. */
export function staffMustChangePassword(
  appMetadata: Record<string, unknown> | null | undefined,
): boolean {
  return appMetadata?.must_change_password === true;
}

export const STAFF_FORCE_PASSWORD_PATH = "/admin/profile";
