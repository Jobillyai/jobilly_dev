import { createClient } from "@/server/db/supabase-server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";

export type AdminUser = SessionUser & {
  role: "admin";
};

export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role ?? null;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const role = await getUserRole(user.id);
  if (!isAdminRole(role)) {
    return null;
  }

  return { ...user, role: "admin" };
}
