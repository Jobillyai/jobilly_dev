import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getUserProfile } from "@/lib/auth/profile";
import { ProfileForm } from "@/components/profile/profile-form";
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

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <section className={styles.section}>
          <ProfileForm
            profile={profile}
            backHref="/admin"
            backLabel="Back to dashboard"
          />
        </section>
      </main>
    </div>
  );
}
