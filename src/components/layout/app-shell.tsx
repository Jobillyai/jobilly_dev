import { getShellAuth } from "@/lib/auth/shell-auth";
import { NavSwitcher } from "@/components/layout/nav-switcher";
import { ShellContent } from "@/components/layout/shell-content";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, adminUser } = await getShellAuth();

  return (
    <>
      <NavSwitcher user={user} adminUser={adminUser} />
      <ShellContent user={user} adminUser={adminUser}>{children}</ShellContent>
    </>
  );
}
