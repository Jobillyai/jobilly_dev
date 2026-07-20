import { redirect } from "next/navigation";
import { CandidateSidebar } from "@/components/candidate/candidate-sidebar";
import { CandidateMobileNav } from "@/components/candidate/candidate-mobile-nav";
import { CandidateMobileHeader } from "@/components/candidate/candidate-mobile-header";
import shellStyles from "@/components/admin/admin-shell.module.css";
import portalStyles from "@/components/candidate/portal-content.module.css";
import { getSessionUser } from "@/lib/auth/session";
import { getUnreadAppliedJobCount } from "@/server/services/candidate-jobs";
import { getCandidateEntitlements } from "@/server/services/candidate-subscriptions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const entitlements = await getCandidateEntitlements(user.id);
  const unreadApplications = entitlements.hasManagedApplications
    ? await getUnreadAppliedJobCount(user.id)
    : 0;

  return (
    <div className={shellStyles.adminShell}>
      <CandidateSidebar unreadApplications={unreadApplications} />
      <div className={`${shellStyles.adminContent} ${portalStyles.content}`}>
        <CandidateMobileHeader />
        <div className={portalStyles.contentInner}>{children}</div>
      </div>
      <CandidateMobileNav unreadApplications={unreadApplications} />
    </div>
  );
}
