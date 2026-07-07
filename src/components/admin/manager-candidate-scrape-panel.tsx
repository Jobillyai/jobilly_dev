"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  scrapeAllCandidatesJobsAction,
  scrapeSingleCandidateJobsAction,
  updateCandidateExperienceYearsAction,
  updateCandidateJobRoleAction,
} from "@/server/actions/candidate-jobs";
import {
  experienceLevelFromYears,
  formatExperienceYears,
  yearsFromExperienceLevel,
  type ExperienceLevel,
} from "@/lib/format-experience-years";
import styles from "./manager-candidate-scrape-panel.module.css";

export type ManagerCandidateRow = {
  id: string;
  displayName: string;
  email: string;
  defaultRole: string;
  savedRole: string;
  defaultExperienceYears: number | null;
  savedExperienceYears: number | null;
  totalJobs: number;
};

type ManagerCandidateScrapePanelProps = {
  candidates: ManagerCandidateRow[];
  lastRunLabel: string | null;
};

type RowStatus = {
  kind: "idle" | "saving" | "scraping" | "done" | "error";
  message?: string;
};

export function ManagerCandidateScrapePanel({
  candidates,
  lastRunLabel,
}: ManagerCandidateScrapePanelProps) {
  const initialRoles = useMemo(
    () =>
      Object.fromEntries(
        candidates.map((candidate) => [
          candidate.id,
          candidate.savedRole || candidate.defaultRole,
        ]),
      ),
    [candidates],
  );

  const initialExperiences = useMemo(
    () =>
      Object.fromEntries(
        candidates.map((candidate) => [
          candidate.id,
          experienceLevelFromYears(
            candidate.savedExperienceYears ?? candidate.defaultExperienceYears,
          ) ?? "",
        ]),
      ),
    [candidates],
  );

  const [roles, setRoles] = useState<Record<string, string>>(initialRoles);
  const [experiences, setExperiences] = useState<Record<string, ExperienceLevel | "">>(
    initialExperiences as Record<string, ExperienceLevel | "">,
  );
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);
  const [isSequentialRunning, setIsSequentialRunning] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRoles(initialRoles);
    setExperiences(initialExperiences as Record<string, ExperienceLevel | "">);
  }, [initialRoles, initialExperiences]);

  function setRole(candidateId: string, value: string) {
    setRoles((current) => ({ ...current, [candidateId]: value }));
    setRowStatus((current) => ({
      ...current,
      [candidateId]: { kind: "idle" },
    }));
  }

  function setExperienceLevel(candidateId: string, value: ExperienceLevel | "") {
    setExperiences((current) => ({
      ...current,
      [candidateId]: value,
    }));
    setRowStatus((current) => ({
      ...current,
      [candidateId]: { kind: "idle" },
    }));
  }

  async function saveCandidateDetails(candidateId: string) {
    const role = roles[candidateId]?.trim() ?? "";
    const experienceLevel = experiences[candidateId];
    const experienceYears =
      experienceLevel === "" || experienceLevel === undefined
        ? null
        : yearsFromExperienceLevel(experienceLevel);

    if (!role) {
      setRowStatus((current) => ({
        ...current,
        [candidateId]: { kind: "error", message: "Enter a job role." },
      }));
      return false;
    }

    const [roleResult, experienceResult] = await Promise.all([
      updateCandidateJobRoleAction(candidateId, role),
      updateCandidateExperienceYearsAction(candidateId, experienceYears),
    ]);

    if ("error" in roleResult && roleResult.error) {
      setRowStatus((current) => ({
        ...current,
        [candidateId]: { kind: "error", message: roleResult.error },
      }));
      return false;
    }

    if ("error" in experienceResult && experienceResult.error) {
      setRowStatus((current) => ({
        ...current,
        [candidateId]: { kind: "error", message: experienceResult.error },
      }));
      return false;
    }

    return true;
  }

  function handleSaveDetails(candidateId: string) {
    setRowStatus((current) => ({
      ...current,
      [candidateId]: { kind: "saving", message: "Saving…" },
    }));

    startTransition(async () => {
      const ok = await saveCandidateDetails(candidateId);
      if (!ok) {
        return;
      }

      setRowStatus((current) => ({
        ...current,
        [candidateId]: { kind: "done", message: "Role and experience saved." },
      }));
    });
  }

  function experienceYearsForCandidate(candidateId: string): number | null {
    const level = experiences[candidateId];
    if (!level) {
      return null;
    }
    return yearsFromExperienceLevel(level);
  }

  function handleScrapeOne(candidate: ManagerCandidateRow) {
    const role = roles[candidate.id]?.trim() ?? "";
    const experienceYears = experienceYearsForCandidate(candidate.id);
    if (!role) {
      setRowStatus((current) => ({
        ...current,
        [candidate.id]: { kind: "error", message: "Enter a job role first." },
      }));
      return;
    }

    setRowStatus((current) => ({
      ...current,
      [candidate.id]: {
        kind: "scraping",
        message: "Search started — open Jobs to watch listings update.",
      },
    }));
    setBulkMessage(null);

    void scrapeSingleCandidateJobsAction(
      candidate.id,
      role,
      experienceYears,
    ).then((result) => {
      if ("error" in result && result.error) {
        setRowStatus((current) => ({
          ...current,
          [candidate.id]: { kind: "error", message: result.error },
        }));
        return;
      }

      if (!("success" in result) || !result.success) {
        return;
      }

      const scrapeResult = result.result;
      setRowStatus((current) => ({
        ...current,
        [candidate.id]: {
          kind: "done",
          message: scrapeResult.error
            ? scrapeResult.error
            : `${scrapeResult.newJobsAdded} new job${scrapeResult.newJobsAdded === 1 ? "" : "s"} added.`,
        },
      }));
    });
  }

  async function handleScrapeAllSequential() {
    setBulkMessage(null);
    setBulkProgress(null);
    setIsSequentialRunning(true);

    const ordered = [...candidates];
    let processed = 0;
    let newJobsTotal = 0;
    const errors: string[] = [];

    for (const candidate of ordered) {
      const role = roles[candidate.id]?.trim() ?? "";
      const experienceYears = experienceYearsForCandidate(candidate.id);

      setBulkProgress(
        `Searching ${processed + 1} of ${ordered.length}: ${candidate.displayName}…`,
      );
      setRowStatus((current) => ({
        ...current,
        [candidate.id]: role
          ? {
              kind: "scraping",
              message: "Searching in background — open Jobs to watch.",
            }
          : { kind: "error", message: "No role set — skipped." },
      }));

      if (!role) {
        errors.push(`${candidate.email}: no job role set`);
        continue;
      }

      const result = await scrapeSingleCandidateJobsAction(
        candidate.id,
        role,
        experienceYears,
      );
      processed += 1;

      if ("error" in result && result.error) {
        errors.push(`${candidate.email}: ${result.error}`);
        setRowStatus((current) => ({
          ...current,
          [candidate.id]: { kind: "error", message: result.error },
        }));
        continue;
      }

      if (!("success" in result) || !result.success) {
        continue;
      }

      const scrapeResult = result.result;
      newJobsTotal += scrapeResult.newJobsAdded;

      setRowStatus((current) => ({
        ...current,
        [candidate.id]: {
          kind: "done",
          message: scrapeResult.error
            ? scrapeResult.error
            : `${scrapeResult.newJobsAdded} new job${scrapeResult.newJobsAdded === 1 ? "" : "s"}.`,
        },
      }));

      if (scrapeResult.error) {
        errors.push(`${candidate.email}: ${scrapeResult.error}`);
      }
    }

    setBulkProgress(null);
    setIsSequentialRunning(false);
    setBulkMessage(
      `Sequential search complete — ${processed} candidate${processed === 1 ? "" : "s"} processed, ${newJobsTotal} new job${newJobsTotal === 1 ? "" : "s"} added.${errors.length > 0 ? ` ${errors.length} warning${errors.length === 1 ? "" : "s"}.` : ""}`,
    );
  }

  function handleScrapeAllServer() {
    setBulkMessage(null);
    setBulkProgress("Running bulk job search on server…");

    startTransition(async () => {
      const result = await scrapeAllCandidatesJobsAction();
      setBulkProgress(null);

      if ("error" in result && result.error) {
        setBulkMessage(result.error);
        return;
      }

      if ("success" in result && result.success) {
        const { result: scrapeResult } = result;
        setBulkMessage(
          `Bulk search complete — ${scrapeResult.candidatesProcessed} processed, ${scrapeResult.newJobsAdded} new jobs added.`,
        );

        const nextStatus: Record<string, RowStatus> = {};
        for (const row of scrapeResult.perCandidate) {
          nextStatus[row.candidateId] = row.error
            ? { kind: "error", message: row.error }
            : {
                kind: "done",
                message: `${row.newJobsAdded} new job${row.newJobsAdded === 1 ? "" : "s"}.`,
              };
        }
        setRowStatus(nextStatus);
      }
    });
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.title}>Apply for jobs — manager controls</h2>
          <p className={styles.subtitle}>
            Set each candidate&apos;s target role and years of experience, then
            search for jobs. Searches combine the role, career advisory keywords, and
            experience level on Indeed, LinkedIn, Glassdoor, and ZipRecruiter.
          </p>
          {lastRunLabel ? (
            <p className={styles.meta}>Last search run: {lastRunLabel}</p>
          ) : null}
        </div>
        <div className={styles.bulkActions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => void handleScrapeAllSequential()}
            disabled={pending || isSequentialRunning || candidates.length === 0}
          >
            Search all (sequential)
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleScrapeAllServer}
            disabled={pending || isSequentialRunning || candidates.length === 0}
          >
            Quick bulk search
          </button>
        </div>
      </div>

      {bulkProgress ? <p className={styles.progress}>{bulkProgress}</p> : null}
      {bulkMessage ? <p className={styles.summary}>{bulkMessage}</p> : null}

      {candidates.length === 0 ? (
        <p className={styles.empty}>No candidates to search yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Candidate</th>
                <th>Job role</th>
                <th>Experience</th>
                <th>Jobs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, index) => {
                const status = rowStatus[candidate.id];
                const roleValue = roles[candidate.id] ?? "";
                const experienceValue = experiences[candidate.id] ?? "";

                return (
                  <tr key={candidate.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className={styles.candidateCell}>
                        <span className={styles.candidateName}>
                          {candidate.displayName}
                        </span>
                        <span className={styles.candidateEmail}>
                          {candidate.email}
                        </span>
                        <span className={styles.candidateOnFile}>
                          On file:{" "}
                          {candidate.savedRole ||
                            candidate.defaultRole ||
                            "No role"}{" "}
                          ·{" "}
                          {formatExperienceYears(candidate.savedExperienceYears) ||
                            "No exp."}
                        </span>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.roleInput}
                        value={roleValue}
                        onChange={(event) =>
                          setRole(candidate.id, event.target.value)
                        }
                        placeholder="e.g. Software Engineer"
                        aria-label={`Job role for ${candidate.displayName}`}
                      />
                    </td>
                    <td>
                      <select
                        className={styles.experienceInput}
                        value={experienceValue}
                        onChange={(event) =>
                          setExperienceLevel(
                            candidate.id,
                            event.target.value as ExperienceLevel | "",
                          )
                        }
                        aria-label={`Experience level for ${candidate.displayName}`}
                      >
                        <option value="">Not set</option>
                        <option value="entry">Entry level</option>
                        <option value="mid">Mid level</option>
                        <option value="senior">Senior</option>
                      </select>
                    </td>
                    <td>{candidate.totalJobs}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => handleSaveDetails(candidate.id)}
                          disabled={pending || isSequentialRunning}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className={styles.primaryBtn}
                          onClick={() => handleScrapeOne(candidate)}
                          disabled={pending || isSequentialRunning}
                        >
                          Search jobs
                        </button>
                        <Link
                          href={`/admin/candidates/${candidate.id}/jobs`}
                          className={styles.linkBtn}
                        >
                          Apply for jobs
                        </Link>
                      </div>
                      <p className={styles.scrapeHint}>Saves role + years, then searches for jobs</p>
                      {status?.message ? (
                        <p
                          className={
                            status.kind === "error"
                              ? styles.rowError
                              : styles.rowMessage
                          }
                        >
                          {status.message}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
