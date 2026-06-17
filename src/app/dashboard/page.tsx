import { getSessionUser } from "@/lib/auth/session";
import { FeatureCards } from "@/components/marketing/feature-cards";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <em className={styles.titleEm}>Welcome</em>
            {user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className={styles.subtitle}>
            Everything you need to go from graduate to hired — pick a feature to get
            started.
          </p>
        </div>

        <FeatureCards developmentInProgress />
      </main>
    </div>
  );
}
