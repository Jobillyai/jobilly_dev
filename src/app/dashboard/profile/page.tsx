import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import dashboardStyles from "../dashboard.module.css";

export default async function ProfilePage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className={dashboardStyles.page}>
      <main className={dashboardStyles.main}>
        <ProfileForm profile={profile} />
      </main>
    </div>
  );
}
