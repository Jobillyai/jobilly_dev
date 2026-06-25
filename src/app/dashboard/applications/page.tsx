import { redirect } from "next/navigation";
import { formatJobSourceLabel } from "@/server/services/apify-job-search";
import { getSessionUser } from "@/lib/auth/session";
import { getCandidateAppliedJobs } from "@/server/services/candidate-jobs";
import styles from "../dashboard.module.css";
import pageStyles from "./applications.module.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CandidateApplicationsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const applications = await getCandidateAppliedJobs(user.id);

  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${pageStyles.main}`}>
        <div className={pageStyles.header}>
          <h1 className={styles.title}>
            My <em className={styles.titleEm}>Applications</em>
          </h1>
          <p className={pageStyles.subtitle}>
            Jobs your Jobilly team has applied to on your behalf. New applications appear
            here after admin marks them as applied.
          </p>
        </div>

        {applications.length === 0 ? (
          <div className={pageStyles.emptyCard}>
            <p className={pageStyles.emptyTitle}>No applications yet</p>
            <p className={pageStyles.emptyText}>
              Once our team applies to matched roles for you, they will show up here with
              the company, role, and job link.
            </p>
          </div>
        ) : (
          <ul className={pageStyles.list}>
            {applications.map((job) => (
              <li key={job.id} className={pageStyles.card}>
                <div className={pageStyles.cardHeader}>
                  <div>
                    <p className={pageStyles.role}>{job.role}</p>
                    <p className={pageStyles.company}>{job.company}</p>
                  </div>
                  <span className={pageStyles.badge}>Applied</span>
                </div>
                <p className={pageStyles.meta}>
                  {job.location} · {formatJobSourceLabel(job.source, job.jobUrl)} · Applied{" "}
                  {formatDate(job.appliedAt)}
                </p>
                {job.jdText ? <p className={pageStyles.description}>{job.jdText}</p> : null}
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={pageStyles.linkBtn}
                >
                  View job posting
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
