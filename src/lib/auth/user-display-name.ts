import type { User } from "@supabase/supabase-js";
import { getNameFromMetadata } from "@/lib/format-person-name";

export function getAuthUserDisplayName(user: User): string | null {
  const { fullName } = getNameFromMetadata(user.user_metadata);
  return fullName || null;
}

export function getAuthUserFirstLastName(user: User): {
  firstName: string;
  lastName: string;
} {
  const { firstName, lastName } = getNameFromMetadata(user.user_metadata);
  return { firstName, lastName };
}
