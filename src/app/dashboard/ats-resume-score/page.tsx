import { redirect } from "next/navigation";
import { AtsResumeScoreForm } from "@/components/resume-ats/ats-resume-score-form";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCandidateResumeContext,
  listResumeAtsChecks,
} from "@/server/services/resume-ats-check";
import styles from "../dashboard.module.css";
import pageStyles from "./ats-resume-score.module.css";

type AtsResumeScorePageProps = {
  searchParams?: {
    check?: string;
  };
};

export default async function AtsResumeScorePage({
  searchParams,
}: AtsResumeScorePageProps) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const [resumeContext, recentChecks] = await Promise.all([
    getCandidateResumeContext(user.id),
    listResumeAtsChecks(user.id),
  ]);

  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${pageStyles.main}`}>
        <AtsResumeScoreForm
          resumeContext={resumeContext}
          recentChecks={recentChecks}
          selectedCheckId={searchParams?.check ?? null}
        />
      </main>
    </div>
  );
}
