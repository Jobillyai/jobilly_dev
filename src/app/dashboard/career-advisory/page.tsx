import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/profile";
import { CareerAdvisoryForm } from "@/components/career-advisory/career-advisory-form";
import { getCareerAdvisoryIntakeForCandidate } from "@/server/services/career-advisory-intake";
import dashboardStyles from "../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function CareerAdvisoryPage() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const existingIntake = await getCareerAdvisoryIntakeForCandidate(profile.id);

  return (
    <div className={dashboardStyles.page}>
      <main className={dashboardStyles.main}>
        <CareerAdvisoryForm
          defaultFirstName={profile.firstName}
          defaultLastName={profile.lastName}
          defaultEmail={profile.email}
          existingIntake={existingIntake}
        />
      </main>
    </div>
  );
}
