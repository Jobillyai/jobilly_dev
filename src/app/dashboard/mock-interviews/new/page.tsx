export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { MockInterviewStudio } from "@/components/dashboard/mock-interview-studio";
import {
  entitlementsForPlan,
  getCandidateSubscription,
} from "@/server/services/candidate-subscriptions";
import dashboardStyles from "../../dashboard.module.css";
import styles from "./new-interview.module.css";

export default async function NewMockInterviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const subscription = await getCandidateSubscription(user.id);
  if (!entitlementsForPlan(subscription?.plan).hasMockInterviews) {
    redirect("/dashboard/mock-interviews");
  }

  return (
    <div className={dashboardStyles.page}>
      <main className={`${dashboardStyles.main} ${styles.main}`}>
        <Link href="/dashboard/mock-interviews" className={styles.backLink}>
          <ArrowLeft size={16} />
          Performance dashboard
        </Link>

        <header className={styles.header}>
          <div>
            <p className={dashboardStyles.eyebrow}>Mock interview studio</p>
            <h1 className={dashboardStyles.title}>Prepare your interview room</h1>
            <p className={dashboardStyles.subtitle}>
              Choose a practice format and check your microphone before entering the
              interview.
            </p>
          </div>
          <span className={styles.previewBadge}>Experience preview</span>
        </header>

        <MockInterviewStudio candidateName={user.name || "Candidate"} />
      </main>
    </div>
  );
}
