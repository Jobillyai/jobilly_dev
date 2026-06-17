import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import authStyles from "@/components/auth/auth-page.module.css";

export default async function ProfilePage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className={authStyles.shell}>
      <div className={authStyles.bgCircle1} aria-hidden />
      <div className={authStyles.bgCircle2} aria-hidden />
      <div className={authStyles.content}>
        <div className={authStyles.card}>
          <ProfileForm profile={profile} />
        </div>
      </div>
    </div>
  );
}
