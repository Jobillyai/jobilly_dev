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
        <header className={dashboardStyles.topBar}>
          <div>
            <p className={dashboardStyles.eyebrow}>Student portal</p>
            <h1 className={dashboardStyles.title}>My profile</h1>
            <p className={dashboardStyles.subtitle}>
              Keep your resume, education, and career preferences up to date.
            </p>
          </div>
          <p className={dashboardStyles.dateLabel}>
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </p>
        </header>
        <ProfileForm profile={profile} />
      </main>
    </div>
  );
}
