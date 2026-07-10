import { redirect } from "next/navigation";
import { CandidateSidebar } from "@/components/candidate/candidate-sidebar";
import shellStyles from "@/components/admin/admin-shell.module.css";
import portalStyles from "@/components/candidate/portal-content.module.css";
import { getSessionUser } from "@/lib/auth/session";
import { getUnreadAppliedJobCount } from "@/server/services/candidate-jobs";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const unreadApplications = await getUnreadAppliedJobCount(user.id);

  return (
    <div className={shellStyles.adminShell}>
      <CandidateSidebar unreadApplications={unreadApplications} />
      <div className={`${shellStyles.adminContent} ${portalStyles.content}`}>
        <div className={portalStyles.contentInner}>{children}</div>
      </div>
    </div>
  );
}
