import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { CareerAdvisoryForm } from "@/components/career-advisory/career-advisory-form";
import { getCareerAdvisoryIntakeForCandidate } from "@/server/services/career-advisory-intake";
import authStyles from "@/components/auth/auth-page.module.css";
import formStyles from "@/components/career-advisory/career-advisory-form.module.css";

export default async function CareerAdvisoryPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const existingIntake = await getCareerAdvisoryIntakeForCandidate(user.id);

  return (
    <div className={authStyles.shell}>
      <div className={authStyles.content}>
        <div className={`${authStyles.card} ${formStyles.wideCard}`}>
          <CareerAdvisoryForm
            defaultName={user.name ?? ""}
            defaultEmail={user.email}
            existingIntake={existingIntake}
          />
        </div>
      </div>
    </div>
  );
}
