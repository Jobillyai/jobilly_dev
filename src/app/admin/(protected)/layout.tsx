import { redirect } from "next/navigation";
import { getAdminUser, staffIsManager, toStaffContext } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { PostAuthWelcomeSplash } from "@/components/layout/post-auth-welcome-splash";
import shellStyles from "@/components/admin/admin-shell.module.css";
import portalStyles from "@/components/admin/admin-portal-content.module.css";
import { postAuthWelcomeDisplayName } from "@/lib/auth/post-auth-welcome";

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
      <PostAuthWelcomeSplash name={postAuthWelcomeDisplayName(admin.name, admin.email)} />
      <AdminSidebar
        showJobApplyNav={!staffIsManager(staff)}
        showManagerNav={staffIsManager(staff)}
      />
      <div className={`${shellStyles.adminContent} ${portalStyles.content}`}>
        <AdminMobileHeader />
        <div className={portalStyles.contentInner}>{children}</div>
      </div>
      <AdminMobileNav
        showJobApplyNav={!staffIsManager(staff)}
        showManagerNav={staffIsManager(staff)}
      />
    </div>
  );
}
