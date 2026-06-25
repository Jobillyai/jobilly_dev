"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkAtsResumeAction,
  type AtsResumeCheckState,
} from "@/server/actions/resume-ats-check";
import {
  ATS_TARGET_ROLES,
  type AtsScoreResult,
} from "@/server/services/apify-ats-score";
import type {
  CandidateResumeContext,
  ResumeAtsCheck,
} from "@/server/services/resume-ats-check";
import { SubmitButton } from "@/components/auth/submit-button";
import authStyles from "@/components/auth/auth-page.module.css";
import styles from "./ats-resume-score-form.module.css";

type AtsResumeScoreFormProps = {
  resumeContext: CandidateResumeContext;
  recentChecks: ResumeAtsCheck[];
  selectedCheckId: string | null;
};

const initialState: AtsResumeCheckState = {};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function scoreTone(score: number): string {
  if (score >= 80) {
    return styles.scoreGood ?? "";
  }
  if (score >= 60) {
    return styles.scoreMid ?? "";
  }
  return styles.scoreLow ?? "";
}

function breakdownLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function ScoreBreakdown({ result }: { result: AtsScoreResult }) {
  if (!result.scoreBreakdown) {
    return null;
  }

  return (
    <div className={styles.breakdownGrid}>
      {Object.entries(result.scoreBreakdown).map(([key, item]) => {
        const percent = item.max > 0 ? Math.round((item.score / item.max) * 100) : 0;

        return (
          <div key={key} className={styles.breakdownItem}>
            <div className={styles.breakdownHeader}>
              <span>{breakdownLabel(key)}</span>
              <span>
                {item.score}/{item.max}
              </span>
            </div>
            <div className={styles.breakdownTrack}>
              <div
                className={styles.breakdownFill}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AtsResumeScoreForm({
  resumeContext,
  recentChecks,
  selectedCheckId,
}: AtsResumeScoreFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<AtsResumeCheckState>(initialState);
  const [pending, startTransition] = useTransition();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [usingNewUpload, setUsingNewUpload] = useState(false);

  const [targetRole, setTargetRole] = useState<string>("Software Engineer");
  const [jobDescription, setJobDescription] = useState("");

  const activeCheckId = selectedCheckId ?? state.checkId ?? null;

  const activeResult = useMemo(() => {
    if (activeCheckId) {
      const fromHistory = recentChecks.find((check) => check.id === activeCheckId)?.result;
      if (fromHistory) {
        return fromHistory;
      }
    }

    if (state.result && state.checkId === activeCheckId) {
      return state.result;
    }

    return null;
  }, [activeCheckId, recentChecks, state.checkId, state.result]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await checkAtsResumeAction(state, formData);
      setState(result);
      if (result.success && result.checkId) {
        setUsingNewUpload(false);
        setSelectedFileName(null);
        router.replace(`/dashboard/ats-resume-score?check=${result.checkId}`, {
          scroll: false,
        });
        router.refresh();
      }
    });
  }

  function selectCheck(checkId: string) {
    router.replace(`/dashboard/ats-resume-score?check=${checkId}`, { scroll: false });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name ?? null);
    setUsingNewUpload(Boolean(file));
  }

  const showSavedResume =
    resumeContext.hasStoredResume && !usingNewUpload && !selectedFileName;

  return (
    <div className={styles.layout}>
      <section className={styles.formPanel}>
        <div className={authStyles.header}>
          <h1 className={authStyles.title}>
            ATS resume <em className={authStyles.titleEm}>score</em>
          </h1>
          <p className={authStyles.subtitle}>
            Upload your resume as PDF or Word, pick a target role, and get an ATS
            score with keyword gaps and improvement tips.
          </p>
        </div>

        <form action={handleSubmit} className={authStyles.form}>
          <div className={authStyles.field}>
            <label htmlFor="targetRole" className={authStyles.label}>
              Target role
            </label>
            <select
              id="targetRole"
              name="targetRole"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              className={`${styles.select} ${
                state.fieldErrors?.targetRole ? styles.fieldError : ""
              }`}
            >
              {ATS_TARGET_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {state.fieldErrors?.targetRole && (
              <p className={authStyles.fieldError}>{state.fieldErrors.targetRole}</p>
            )}
          </div>

          <div className={authStyles.field}>
            <label htmlFor="jobDescription" className={authStyles.label}>
              Job description (optional)
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              rows={6}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job posting to check extra keywords from that role…"
              className={styles.textarea}
            />
            {state.fieldErrors?.jobDescription && (
              <p className={authStyles.fieldError}>{state.fieldErrors.jobDescription}</p>
            )}
          </div>

          <div className={authStyles.field}>
            <span className={authStyles.label}>Your resume</span>
            <div
              className={`${styles.uploadZone} ${
                state.fieldErrors?.resume ? styles.uploadZoneError : ""
              }`}
            >
              <input
                ref={fileInputRef}
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
              />
              <p className={styles.uploadTitle}>Upload PDF or Word resume</p>
              <p className={styles.fieldHint}>Max 5 MB · .pdf, .doc, or .docx</p>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </button>
              {selectedFileName ? (
                <p className={styles.selectedFile}>Selected: {selectedFileName}</p>
              ) : showSavedResume ? (
                <p className={styles.selectedFile}>
                  Using your saved resume. Choose a new file to replace it.
                </p>
              ) : null}
              {showSavedResume && resumeContext.resumePreviewUrl ? (
                <a
                  href={resumeContext.resumePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fileLink}
                >
                  View saved resume
                </a>
              ) : null}
            </div>
            {state.fieldErrors?.resume && (
              <p className={authStyles.fieldError}>{state.fieldErrors.resume}</p>
            )}
          </div>

          {state.error && (
            <p role="alert" className={authStyles.alert}>
              {state.error}
            </p>
          )}

          <SubmitButton pending={pending} pendingLabel="Checking ATS score…">
            Check ATS score
          </SubmitButton>
        </form>
      </section>

      <aside className={styles.resultPanel}>
        {activeResult ? (
          <div className={styles.resultCard}>
            <div className={styles.scoreHero}>
              <div className={`${styles.scoreCircle} ${scoreTone(activeResult.atsScore)}`}>
                <span className={styles.scoreValue}>{activeResult.atsScore}</span>
                <span className={styles.scoreMax}>/100</span>
              </div>
              <div>
                <p className={styles.resultLabel}>ATS score</p>
                <p className={styles.resultMeta}>
                  Grade {activeResult.grade} · {activeResult.targetRole}
                </p>
                {typeof activeResult.keywordMatchPercent === "number" && (
                  <p className={styles.resultSubMeta}>
                    Keyword match: {activeResult.keywordMatchPercent}%
                  </p>
                )}
              </div>
            </div>

            <ScoreBreakdown result={activeResult} />

            {activeResult.keywords?.missing && activeResult.keywords.missing.length > 0 && (
              <div className={styles.tagSection}>
                <p className={styles.tagTitle}>Missing keywords</p>
                <div className={styles.tagList}>
                  {activeResult.keywords.missing.slice(0, 12).map((keyword) => (
                    <span key={keyword} className={styles.tagMissing}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeResult.keywords?.found && activeResult.keywords.found.length > 0 && (
              <div className={styles.tagSection}>
                <p className={styles.tagTitle}>Matched keywords</p>
                <div className={styles.tagList}>
                  {activeResult.keywords.found.slice(0, 12).map((keyword) => (
                    <span key={keyword} className={styles.tagMatched}>
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeResult.improvements && activeResult.improvements.length > 0 && (
              <div className={styles.improvementsSection}>
                <p className={styles.tagTitle}>Improvements</p>
                <ul className={styles.improvementsList}>
                  {activeResult.improvements.slice(0, 5).map((item, index) => (
                    <li key={`${item.category ?? "item"}-${index}`}>
                      {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.placeholderCard}>
            <p className={styles.placeholderTitle}>Your ATS score appears here</p>
            <p className={styles.placeholderText}>
              Upload your resume, choose a target role, and run the check. Scores are
              powered by Apify and saved to your history.
            </p>
          </div>
        )}

        <div className={styles.historySection}>
          <h2 className={styles.historyTitle}>Recent checks</h2>
          {recentChecks.length === 0 ? (
            <p className={styles.historyEmpty}>No ATS checks yet.</p>
          ) : (
            <ul className={styles.historyList}>
              {recentChecks.map((check) => (
                <li key={check.id}>
                  <button
                    type="button"
                    className={`${styles.historyItem} ${
                      activeCheckId === check.id ? styles.historyItemActive : ""
                    }`}
                    onClick={() => selectCheck(check.id)}
                  >
                    <div>
                      <p className={styles.historyJob}>{check.targetRole}</p>
                      <p className={styles.historyMeta}>{formatDate(check.createdAt)}</p>
                    </div>
                    {check.atsScore !== null ? (
                      <span className={`${styles.historyScore} ${scoreTone(check.atsScore)}`}>
                        {check.atsScore}
                      </span>
                    ) : (
                      <span className={styles.historyFailed}>Failed</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
