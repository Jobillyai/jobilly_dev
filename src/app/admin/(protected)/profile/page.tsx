import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import {
  getAdminUser,
  staffIsManager,
  staffIsTechnicalManager,
  toStaffContext,
} from "@/lib/auth/admin";
import { getUserProfile } from "@/lib/auth/profile";
import { staffMustChangePassword } from "@/lib/auth/staff-password";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StaffProfileCard } from "@/components/admin/staff-profile-card";
import styles from "../../admin.module.css";

type AdminProfilePageProps = {
  searchParams?: Promise<{ forcePassword?: string }>;
};

export default async function AdminProfilePage({
  searchParams,
}: AdminProfilePageProps) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const profile = await getUserProfile();

  if (!profile) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isManager = staffIsManager(staff);
  const isTechnical = staffIsTechnicalManager(staff);
  const roleLabel = isTechnical
    ? "Technical manager"
    : isManager
      ? "Manager"
      : "Admin";

  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const forcePassword =
    params.forcePassword === "1" ||
    staffMustChangePassword(
      authData.user?.app_metadata as Record<string, unknown> | undefined,
    );

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <AdminPageHeader
          eyebrow="Account"
          title="My profile"
          subtitle={
            forcePassword
              ? "Set a new password and complete your basic details to continue."
              : `Your ${roleLabel.toLowerCase()} profile for the admin portal.`
          }
        />

        <section className={styles.section}>
          <StaffProfileCard
            profile={profile}
            roleLabel={roleLabel}
            forcePassword={forcePassword}
            showHeader={false}
          />
        </section>
      </main>
    </div>
  );
}
