export type UserRole =
  | "subscribed_candidate"
  | "free_candidate"
  | "employee"
  | "admin"
  | "institution_admin"
  | "institution_candidate";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}
