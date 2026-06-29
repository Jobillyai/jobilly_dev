"use client";

import { useState, useTransition } from "react";
import { scrapeAllCandidatesJobsAction } from "@/server/actions/candidate-jobs";
import styles from "@/app/admin/admin.module.css";

type ManagerScrapePanelProps = {
  lastRunLabel: string | null;
};

export function ManagerScrapePanel({ lastRunLabel }: ManagerScrapePanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleScrapeAll() {
    setMessage(null);
    startTransition(async () => {
      const result = await scrapeAllCandidatesJobsAction();
      if ("error" in result && result.error) {
        setMessage(result.error);
        return;
      }

      if ("success" in result && result.success) {
        const { result: scrapeResult } = result;
        setMessage(
          `Scrape complete — ${scrapeResult.candidatesProcessed} candidate${scrapeResult.candidatesProcessed === 1 ? "" : "s"} processed, ${scrapeResult.newJobsAdded} new job${scrapeResult.newJobsAdded === 1 ? "" : "s"} added.`,
        );
      }
    });
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Manager scrape controls</h2>
      <p className={styles.subtitle}>
        Job listings refresh automatically every 3 hours. Mentors see stored jobs
        when they log in — they do not run scrapes themselves.
      </p>
      {lastRunLabel ? (
        <p className={styles.subtitle}>Last scrape run: {lastRunLabel}</p>
      ) : null}
      <button
        type="button"
        className={styles.jobsBtn}
        onClick={handleScrapeAll}
        disabled={pending}
      >
        {pending ? "Scraping all candidates…" : "Scrape all candidates now"}
      </button>
      {message ? <p className={styles.subtitle}>{message}</p> : null}
    </section>
  );
}
