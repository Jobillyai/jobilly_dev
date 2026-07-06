import { getSessionUser } from "@/lib/auth/session";
import { SiteFooter } from "./site-footer";

export async function SiteFooterShell() {
  const user = await getSessionUser();

  return <SiteFooter user={user} />;
}
