import { NavSwitcher } from "@/components/layout/nav-switcher";
import { ShellContent } from "@/components/layout/shell-content";
import { getAdminUser } from "@/lib/auth/admin";
import { getSessionUser } from "@/lib/auth/session";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, adminUser] = await Promise.all([
    getSessionUser(),
    getAdminUser(),
  ]);

  return (
    <>
      <NavSwitcher user={user} adminUser={adminUser} />
      <ShellContent user={user} adminUser={adminUser}>{children}</ShellContent>
    </>
  );
}
