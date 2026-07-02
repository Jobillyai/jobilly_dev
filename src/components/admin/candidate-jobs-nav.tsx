import Link from "next/link";
import type { Route } from "next";
import styles from "./candidate-jobs-nav.module.css";

type CandidateJobsNavProps = {
  candidateId: string;
  appliedCount: number;
  active: "pipeline" | "applied";
};

export function CandidateJobsNav({
  candidateId,
  appliedCount,
  active,
}: CandidateJobsNavProps) {
  const basePath = `/admin/candidates/${candidateId}/jobs` as Route;
  const appliedPath = `/admin/candidates/${candidateId}/jobs/applied` as Route;

  return (
    <nav className={styles.nav} aria-label="Job views">
      <Link
        href={basePath}
        className={`${styles.tab} ${active === "pipeline" ? styles.tabActive : ""}`}
        aria-current={active === "pipeline" ? "page" : undefined}
      >
        Job pipeline
      </Link>
      <Link
        href={appliedPath}
        className={`${styles.tab} ${active === "applied" ? styles.tabActive : ""}`}
        aria-current={active === "applied" ? "page" : undefined}
      >
        Applied
        <span className={styles.count}>{appliedCount}</span>
      </Link>
    </nav>
  );
}
