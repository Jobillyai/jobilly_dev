"use server";

import { createAdminClient } from "@/server/db/supabase-admin";

export async function lookupMemberIdByEmailAction(
  email: string,
): Promise<{ memberId: string | null }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { memberId: null };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("member_id")
    .eq("email", normalized)
    .maybeSingle();

  return { memberId: data?.member_id ?? null };
}
