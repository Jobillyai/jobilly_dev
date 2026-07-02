import { redirect } from "next/navigation";
import { getAdminUser, staffIsManager } from "@/lib/auth/admin";
import { getUserProfile } from "@/lib/auth/profile";
import { StaffProfileCard } from "@/components/admin/staff-profile-card";
import styles from "../../admin.module.css";

export default async function AdminProfilePage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const profile = await getUserProfile();

  if (!profile) {
    redirect("/admin/login");
  }

  const isManager = staffIsManager({ userId: admin.id, role: admin.role });

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <section className={styles.section}>
          <StaffProfileCard
            profile={profile}
            roleLabel={isManager ? "Manager" : "Admin"}
          />
        </section>
      </main>
    </div>
  );
}
