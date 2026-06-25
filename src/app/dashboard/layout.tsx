import { redirect } from "next/navigation";
import { CandidateSidebar } from "@/components/candidate/candidate-sidebar";
import shellStyles from "@/components/admin/admin-shell.module.css";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className={shellStyles.adminShell}>
      <CandidateSidebar />
      <div className={shellStyles.adminContent}>{children}</div>
    </div>
  );
}
