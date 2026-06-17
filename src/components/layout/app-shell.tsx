import { AppNavbar } from "@/components/navbar/app-navbar";
import { getSessionUser } from "@/lib/auth/session";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <>
      <AppNavbar user={user} />
      <div className="flex-1 pt-[68px]">{children}</div>
    </>
  );
}
