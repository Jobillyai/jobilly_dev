"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth/session";
import type { AdminUser } from "@/lib/auth/admin";
import { usesPortalTopBar, isAuthRouteWithNavbar, isMinimalAuthRoute } from "@/components/layout/nav-switcher";

type ShellContentProps = {
  children: React.ReactNode;
  user: SessionUser | null;
  adminUser: AdminUser | null;
};

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
  const sidebarShell = usesSidebarShell(pathname);
  const portalTopBar = usesPortalTopBar(pathname, user, adminUser);

  if (sidebarShell || portalTopBar || isMinimalAuthRoute(pathname)) {
    return <div className="min-w-0 w-full max-w-full flex-1">{children}</div>;
  }

  if (isAuthRouteWithNavbar(pathname)) {
    return (
      <div className="auth-with-navbar min-w-0 w-full max-w-full overflow-x-clip flex-1 pt-[72px]">
        {children}
      </div>
    );
  }

  return <div className="min-w-0 w-full max-w-full overflow-x-clip flex-1 pt-[72px]">{children}</div>;
}
