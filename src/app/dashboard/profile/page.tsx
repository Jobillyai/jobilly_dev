import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import dashboardStyles from "../dashboard.module.css";
import pageStyles from "./profile-page.module.css";

export default async function ProfilePage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className={dashboardStyles.page}>
      <main className={`${dashboardStyles.main} ${pageStyles.main}`}>
        <header className={pageStyles.header}>
          <h1 className={dashboardStyles.title}>
            Your <em className={dashboardStyles.titleEm}>profile</em>
          </h1>
          <p className={dashboardStyles.subtitle}>
            Keep your details and resume up to date so your mentor admin can support
            applications and interviews.
          </p>
        </header>

        <ProfileForm profile={profile} />
      </main>
    </div>
  );
}
