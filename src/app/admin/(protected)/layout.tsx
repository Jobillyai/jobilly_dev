import { redirect } from "next/navigation";
import { getAdminUser, staffIsManager, toStaffContext } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import shellStyles from "@/components/admin/admin-shell.module.css";
import portalStyles from "@/components/candidate/portal-content.module.css";

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

  const staff = toStaffContext(admin);

  return (
    <div className={shellStyles.adminShell}>
      <AdminSidebar showJobApplyNav={!staffIsManager(staff)} />
      <div className={`${shellStyles.adminContent} ${portalStyles.content}`}>{children}</div>
    </div>
  );
}
