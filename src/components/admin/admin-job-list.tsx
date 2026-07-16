"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  MapPin,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  formatJobSourceLabel,
  getCleanJobListingUrl,
  resolveJobSource,
} from "@/server/services/job-market-search";
import type { CandidateJobListing, JobListingViewMode } from "@/server/services/candidate-jobs";
import { formatJobFreshnessLabel } from "@/server/services/job-role-cache";
import { isPostedWithinDays } from "@/lib/job-posted-date";
import {
  approveResumeTailoringRunAction,
  generateResumeTailoringRunAction,
  getResumeTailoringRunAction,
} from "@/server/actions/candidate-jobs";
import type { ResumeTailoringRun } from "@/server/services/resume-tailoring-runs";
import styles from "./admin-job-list.module.css";

function formatSummaryDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDetailDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sourceBadgeClass(source: string, jobUrl: string): string {
  const resolved = resolveJobSource(source, jobUrl);
  const fallback = styles.sourceOther ?? "";
  if (resolved === "glassdoor") return styles.sourceGlassdoor ?? fallback;
  if (resolved === "ziprecruiter") return styles.sourceZiprecruiter ?? fallback;
  if (resolved === "linkedin") return styles.sourceLinkedin ?? fallback;
  if (resolved === "indeed") return styles.sourceIndeed ?? fallback;
  return fallback;
}

type AdminJobListProps = {
  candidateId: string;
  jobs: CandidateJobListing[];
  viewMode: JobListingViewMode;
  onToggleSelected: (jobId: string, selected: boolean) => void;
  onToggleApplied: (jobId: string, applied: boolean) => void;
  onUploadApplicationResume: (
    jobId: string,
    file: File,
  ) => Promise<
    | { success: true; fileName: string; downloadUrl: string | null }
    | { error: string }
  >;
};

type AdminJobDetailModalProps = {
  candidateId: string;
  job: CandidateJobListing;
  viewMode: JobListingViewMode;
  onClose: () => void;
  onToggleSelected: (jobId: string, selected: boolean) => void;
  onToggleApplied: (jobId: string, applied: boolean) => void;
  onUploadApplicationResume: AdminJobListProps["onUploadApplicationResume"];
};

function AdminJobDetailModal({
  candidateId,
  job,
  viewMode,
  onClose,
  onToggleSelected,
  onToggleApplied,
  onUploadApplicationResume,
}: AdminJobDetailModalProps) {
  const isAppliedView = viewMode === "applied";
  const listingUrl = getCleanJobListingUrl(job.jobUrl, job.source);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [tailoringRun, setTailoringRun] = useState<ResumeTailoringRun | null>(null);
  const [tailoringLoading, setTailoringLoading] = useState(true);
  const [tailoringError, setTailoringError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    setTailoringLoading(true);
    setTailoringError(null);
    void getResumeTailoringRunAction(candidateId, job.id).then((result) => {
      if (disposed) return;
      setTailoringLoading(false);
      if ("error" in result) {
        setTailoringError(result.error);
      } else {
        setTailoringRun(result.run);
      }
    });
    return () => {
      disposed = true;
    };
  }, [candidateId, job.id]);

  async function handleGenerateTailoredResume() {
    setTailoringLoading(true);
    setTailoringError(null);
    const result = await generateResumeTailoringRunAction(candidateId, job.id);
    setTailoringLoading(false);
    if ("error" in result) {
      setTailoringError(result.error);
    } else {
      setTailoringRun(result.run);
    }
  }

  async function handleApproveTailoredResume() {
    if (!tailoringRun) return;
    setTailoringLoading(true);
    setTailoringError(null);
    const result = await approveResumeTailoringRunAction(
      candidateId,
      job.id,
      tailoringRun.id,
    );
    setTailoringLoading(false);
    if ("error" in result) {
      setTailoringError(result.error);
    } else {
      setTailoringRun(result.run);
    }
  }

  async function handleResumeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploadingResume(true);
    setResumeError(null);
    const result = await onUploadApplicationResume(job.id, file);
    setUploadingResume(false);

    if ("error" in result) {
      setResumeError(result.error);
    }
  }

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`job-modal-title-${job.id}`}
      >
        <header className={styles.modalHeader}>
          <div className={styles.modalHeaderMain}>
            <h2 className={styles.modalCompany}>{job.company}</h2>
            <h3 id={`job-modal-title-${job.id}`} className={styles.modalTitle}>
              {job.role}
            </h3>
            <p className={styles.modalMeta}>
              <span>{job.location}</span>
              <span className={styles.dot} aria-hidden>
                ·
              </span>
              <span
                className={`${styles.sourceBadge} ${sourceBadgeClass(job.source, job.jobUrl)}`}
              >
                {formatJobSourceLabel(job.source, job.jobUrl)}
              </span>
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close job details"
          >
            <X size={22} aria-hidden />
          </button>
        </header>

        <div className={styles.modalBody}>
          <section className={styles.modalSection}>
            <h3 className={styles.sectionTitle}>Overview</h3>
            <div className={styles.overviewGrid}>
              <div className={styles.overviewItem}>
                <span className={styles.overviewLabel}>Found</span>
                <span>{formatDetailDate(job.scrapedAt)}</span>
              </div>
              {job.postedAt ? (
                <div className={styles.overviewItem}>
                  <span className={styles.overviewLabel}>Posted</span>
                  <span>
                    {formatSummaryDate(job.postedAt)}
                    <span
                      className={`${styles.freshnessBadge} ${
                        isPostedWithinDays(job.postedAt, 3)
                          ? styles.freshnessFresh
                          : styles.freshnessStale
                      }`}
                    >
                      {formatJobFreshnessLabel(job.postedAt)}
                    </span>
                  </span>
                </div>
              ) : (
                <div className={styles.overviewItem}>
                  <span className={styles.overviewLabel}>Posted</span>
                  <span className={styles.unknown}>Unknown</span>
                </div>
              )}
              {isAppliedView && job.appliedAt ? (
                <div className={styles.overviewItem}>
                  <span className={styles.overviewLabel}>Applied</span>
                  <span>{formatDetailDate(job.appliedAt)}</span>
                </div>
              ) : null}
              {!isAppliedView && job.selected ? (
                <div className={styles.overviewItem}>
                  <span className={styles.overviewLabel}>Status</span>
                  <span className={styles.shortlistBadge}>Shortlisted</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.modalSection}>
            <h3 className={styles.sectionTitle}>Links</h3>
            <div className={styles.linkSection}>
              <a
                href={listingUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.jobLink}
                title={listingUrl}
              >
                <ExternalLink size={14} aria-hidden />
                View job listing
              </a>
              {job.applyUrl ? (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.jobLink}
                  title={job.applyUrl}
                >
                  <ExternalLink size={14} aria-hidden />
                  Apply on site
                </a>
              ) : null}
            </div>
          </section>

          <section className={`${styles.modalSection} ${styles.tailorSection}`}>
            <div className={styles.tailorHeader}>
              <div>
                <p className={styles.tailorEyebrow}>AI-assisted · Admin review required</p>
                <h3 className={styles.sectionTitle}>Tailor resume to this job</h3>
              </div>
              {tailoringRun?.status === "approved" ? (
                <span className={styles.tailorApproved}>
                  <CheckCircle2 size={14} />
                  Approved
                </span>
              ) : null}
            </div>

            {tailoringLoading ||
            tailoringRun?.status === "queued" ||
            tailoringRun?.status === "generating" ? (
              <div className={styles.tailorLoading}>
                <LoaderCircle size={18} className={styles.tailorSpinner} />
                <span>Loading resume tailoring…</span>
              </div>
            ) : tailoringRun?.status === "review_required" ||
              tailoringRun?.status === "approved" ? (
              <div className={styles.tailorResult}>
                <div className={styles.tailorScore}>
                  <strong>{tailoringRun.atsScore ?? 0}</strong>
                  <span>ATS keyword coverage</span>
                </div>
                <div className={styles.tailorDownloads}>
                  {tailoringRun.docxDownloadUrl ? (
                    <a href={tailoringRun.docxDownloadUrl} target="_blank" rel="noreferrer">
                      <Download size={14} />
                      Editable DOCX
                    </a>
                  ) : null}
                  {tailoringRun.pdfDownloadUrl ? (
                    <a href={tailoringRun.pdfDownloadUrl} target="_blank" rel="noreferrer">
                      <Download size={14} />
                      Review PDF
                    </a>
                  ) : null}
                </div>
                {tailoringRun.result ? (
                  <div className={styles.tailorReviewGrid}>
                    <div>
                      <h4>Changes made</h4>
                      <ul>
                        {tailoringRun.result.changeSummary.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4>Missing requirements</h4>
                      {tailoringRun.result.missingRequirements.length > 0 ? (
                        <ul>
                          {tailoringRun.result.missingRequirements.map((requirement) => (
                            <li key={requirement}>{requirement}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No unsupported requirements identified.</p>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className={styles.tailorActions}>
                  <button type="button" onClick={() => void handleGenerateTailoredResume()}>
                    <WandSparkles size={15} />
                    Generate new version
                  </button>
                  {tailoringRun.status === "review_required" ? (
                    <button
                      type="button"
                      className={styles.tailorApproveBtn}
                      onClick={() => void handleApproveTailoredResume()}
                    >
                      <CheckCircle2 size={15} />
                      Approve and attach PDF
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className={styles.tailorEmpty}>
                <WandSparkles size={22} />
                <div>
                  <strong>
                    {tailoringRun?.status === "failed"
                      ? "The previous generation failed"
                      : "Create a factual, ATS-safe tailored resume"}
                  </strong>
                  <p>
                    The base resume stays unchanged. Unsupported job requirements are
                    flagged instead of added as candidate claims.
                  </p>
                </div>
                <button type="button" onClick={() => void handleGenerateTailoredResume()}>
                  {tailoringRun?.status === "failed" ? "Retry tailoring" : "Tailor resume"}
                </button>
              </div>
            )}

            {tailoringRun?.status === "failed" && tailoringRun.errorMessage ? (
              <p className={styles.tailorError}>
                <AlertTriangle size={14} />
                {tailoringRun.errorMessage}
              </p>
            ) : null}
            {tailoringError ? (
              <p className={styles.tailorError}>
                <AlertTriangle size={14} />
                {tailoringError}
              </p>
            ) : null}
          </section>

          {isAppliedView ? (
            <section className={styles.modalSection}>
              <h3 className={styles.sectionTitle}>Resume used for this application</h3>
              <div className={styles.resumeAttachment}>
                {job.applicationResumeDownloadUrl ? (
                  <a
                    href={job.applicationResumeDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.resumeFile}
                    title={job.applicationResumeFileName ?? undefined}
                  >
                    <FileText size={18} aria-hidden />
                    <span>{job.applicationResumeFileName ?? "View attached resume"}</span>
                  </a>
                ) : (
                  <p className={styles.resumeEmpty}>
                    No resume attached. Attach the exact resume used so the candidate
                    can reference it later.
                  </p>
                )}

                <label className={styles.resumeUploadBtn}>
                  <Upload size={16} aria-hidden />
                  <span>
                    {uploadingResume
                      ? "Uploading…"
                      : job.applicationResumeFileName
                        ? "Replace resume"
                        : "Attach resume"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => void handleResumeFile(event)}
                    disabled={uploadingResume}
                  />
                </label>
              </div>
              {resumeError ? <p className={styles.resumeError}>{resumeError}</p> : null}
              <p className={styles.resumeHelp}>PDF or Word document, up to 5 MB.</p>
            </section>
          ) : null}

          <section className={styles.modalSection}>
            <h3 className={styles.sectionTitle}>Job description</h3>
            {job.jdText ? (
              <div className={styles.jdPanel}>
                <div className={styles.jdText}>{job.jdText}</div>
              </div>
            ) : (
              <p className={styles.jdEmpty}>No description captured.</p>
            )}
          </section>
        </div>

        <footer className={styles.modalFooter}>
          {isAppliedView ? (
            <button
              type="button"
              className={styles.undoApplyBtn}
              onClick={() => onToggleApplied(job.id, false)}
            >
              Undo apply
            </button>
          ) : (
            <>
              <label className={styles.actionCheck}>
                <input
                  type="checkbox"
                  checked={job.selected}
                  onChange={(event) => onToggleSelected(job.id, event.target.checked)}
                />
                <span>Shortlist</span>
              </label>
              <label className={styles.actionCheck}>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(event) => onToggleApplied(job.id, event.target.checked)}
                />
                <span>Mark applied</span>
              </label>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function companyInitials(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "?";
  }
  if (words.length === 1) {
    return (words[0] ?? "?").slice(0, 2).toUpperCase();
  }
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

type AdminJobCardProps = {
  job: CandidateJobListing;
  viewMode: JobListingViewMode;
  onOpen: () => void;
};

function AdminJobCard({ job, viewMode, onOpen }: AdminJobCardProps) {
  const isAppliedView = viewMode === "applied";

  return (
    <button
      type="button"
      className={[
        styles.card,
        job.selected && !isAppliedView ? styles.cardSelected : undefined,
        isAppliedView ? styles.cardApplied : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onOpen}
    >
      <div className={styles.cardGlow} aria-hidden />
      <div className={styles.cardHeader}>
        <div className={styles.companyMark} aria-hidden>
          {companyInitials(job.company)}
        </div>
      </div>

      <div className={styles.cardTitles}>
        <h2 className={styles.cardCompany}>{job.company}</h2>
        <h3 className={styles.cardRole}>{job.role}</h3>
        <span
          className={`${styles.sourceBadge} ${sourceBadgeClass(job.source, job.jobUrl)}`}
        >
          {formatJobSourceLabel(job.source, job.jobUrl)}
        </span>
      </div>

      <p className={styles.cardLocation}>
        <MapPin size={14} aria-hidden className={styles.cardLocationIcon} />
        <span>{job.location}</span>
      </p>

      <div className={styles.cardFooter}>
        <span className={styles.cardDate}>
          {isAppliedView ? (
            <>Applied {job.appliedAt ? formatSummaryDate(job.appliedAt) : "—"}</>
          ) : job.postedAt ? (
            <>Posted {formatSummaryDate(job.postedAt)}</>
          ) : (
            <>Found {formatSummaryDate(job.scrapedAt)}</>
          )}
        </span>
        <div className={styles.cardFooterEnd}>
          {!isAppliedView && job.selected ? (
            <span className={styles.cardShortlist}>Shortlisted</span>
          ) : null}
          <span className={styles.cardCta}>Open</span>
        </div>
      </div>
    </button>
  );
}

export function AdminJobList({
  candidateId,
  jobs,
  viewMode,
  onToggleSelected,
  onToggleApplied,
  onUploadApplicationResume,
}: AdminJobListProps) {
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const openJob = jobs.find((job) => job.id === openJobId) ?? null;

  return (
    <>
      <div className={styles.grid}>
        {jobs.map((job) => (
          <AdminJobCard
            key={job.id}
            job={job}
            viewMode={viewMode}
            onOpen={() => setOpenJobId(job.id)}
          />
        ))}
      </div>

      {openJob ? (
        <AdminJobDetailModal
          candidateId={candidateId}
          job={openJob}
          viewMode={viewMode}
          onClose={() => setOpenJobId(null)}
          onToggleSelected={onToggleSelected}
          onToggleApplied={onToggleApplied}
          onUploadApplicationResume={onUploadApplicationResume}
        />
      ) : null}
    </>
  );
}
