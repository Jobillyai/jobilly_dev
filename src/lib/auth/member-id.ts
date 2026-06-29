import { createClient } from "@/server/db/supabase-server";

export async function getUserMemberId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("member_id")
    .eq("id", userId)
    .maybeSingle();

  return data?.member_id ?? null;
}

export function memberIdLabel(memberId: string | null | undefined): string | null {
  if (!memberId) {
    return null;
  }
  return memberId;
}

export function memberIdRoleHint(role: "candidate" | "admin" | "manager"): string {
  if (role === "manager") {
    return "JAM0001";
  }
  if (role === "admin") {
    return "JAE0001";
  }
  return "JAC0001";
}
