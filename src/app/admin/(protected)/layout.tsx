import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { formatDisplayName } from "@/lib/format-display-name";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopNavbar } from "@/components/admin/admin-top-navbar";
import shellStyles from "@/components/admin/admin-shell.module.css";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const displayName = admin.name ? formatDisplayName(admin.name) : null;

  return (
    <div className={shellStyles.adminShellWithNav}>
      <AdminTopNavbar
        userName={displayName}
        memberId={admin.memberId ?? null}
      />
      <div className={shellStyles.adminBody}>
        <AdminSidebar />
        <div className={shellStyles.adminContent}>{children}</div>
      </div>
    </div>
  );
}
