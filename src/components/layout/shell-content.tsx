"use client";

import { usePathname } from "next/navigation";

type ShellContentProps = {
  children: React.ReactNode;
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

export function ShellContent({ children }: ShellContentProps) {
  const pathname = usePathname();
  const sidebarShell = usesSidebarShell(pathname);

  return (
    <div className={sidebarShell ? "flex-1" : "flex-1 pt-[64px]"}>{children}</div>
  );
}
