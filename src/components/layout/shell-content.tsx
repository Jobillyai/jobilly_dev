"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import type { AdminUser } from "@/lib/auth/admin";
import { usesPortalTopBar } from "@/components/layout/nav-switcher";

type ShellContentProps = {
  children: React.ReactNode;
  user: SessionUser | null;
  adminUser: AdminUser | null;
};

function usesAuthShell(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/admin/login")
  );
}

function usesSidebarShell(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) {
    return true;
  }
  if (pathname.startsWith("/admin/login")) {
    return false;
  }
  return pathname.startsWith("/admin");
}

export function ShellContent({ children, user, adminUser }: ShellContentProps) {
  const pathname = usePathname();
  const authShell = usesAuthShell(pathname);
  const sidebarShell = usesSidebarShell(pathname);
  const portalTopBar = usesPortalTopBar(pathname, user, adminUser);

  if (authShell || sidebarShell || portalTopBar) {
    return <div className="flex-1">{children}</div>;
  }

  return <div className="flex-1 pt-[72px]">{children}</div>;
}
