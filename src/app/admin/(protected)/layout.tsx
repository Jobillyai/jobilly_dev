import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
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

  return (
    <div className={shellStyles.adminShell}>
      <AdminSidebar />
      <div className={shellStyles.adminContent}>{children}</div>
    </div>
  );
}
