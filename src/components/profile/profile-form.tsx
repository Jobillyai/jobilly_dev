"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  updateProfileAction,
  uploadAvatarAction,
  uploadProfileResumeAction,
  type ProfileState,
} from "@/server/actions/profile";
import { PersonNameFields } from "@/components/auth/person-name-fields";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import { CANDIDATE_GENDER_OPTIONS } from "@/lib/candidate-profile-options";
import {
  CANDIDATE_LOCATION_OPTIONS,
  resolveTimezoneForLocation,
} from "@/lib/candidate-location-options";
import type { UserProfile } from "@/lib/auth/profile";
import { combineFirstLastName } from "@/lib/format-person-name";
import styles from "./profile-form.module.css";

type ProfileFormProps = {
  profile: UserProfile;
  backHref?: "/dashboard" | "/admin";
  backLabel?: string;
};

const initialState: ProfileState = {};

function getInitials(name: string | undefined, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function fieldClass(isEditing: boolean, hasError?: boolean) {
  return [
    styles.input,
    !isEditing ? styles.readOnlyOverride : "",
    hasError ? styles.inputError : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function ProfileForm({
  profile,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [state, setState] = useState<ProfileState>(initialState);
  const [pending, startTransition] = useTransition();
  const [photoPending, setPhotoPending] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [resumePending, setResumePending] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState(profile.resumeFileName ?? "");
  const [resumePreviewUrl, setResumePreviewUrl] = useState(profile.resumePreviewUrl ?? "");

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [experienceYears, setExperienceYears] = useState(
    profile.experienceYears?.toString() ?? "",
  );
  const [gender, setGender] = useState(profile.gender);
  const [graduationCollege, setGraduationCollege] = useState(profile.graduationCollege);
  const [graduationYear, setGraduationYear] = useState(
    profile.graduationYear?.toString() ?? "",
  );
  const [specialization, setSpecialization] = useState(profile.specialization);
  const [workExperience, setWorkExperience] = useState(profile.workExperience);
  const [location, setLocation] = useState(profile.location);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [careerGoals, setCareerGoals] = useState(profile.careerGoals);
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");

  const displayName = combineFirstLastName(firstName, lastName) || profile.email;

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
      const timer = setTimeout(() => setState(initialState), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  function resetForm() {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setExperienceYears(profile.experienceYears?.toString() ?? "");
    setGender(profile.gender);
    setGraduationCollege(profile.graduationCollege);
    setGraduationYear(profile.graduationYear?.toString() ?? "");
    setSpecialization(profile.specialization);
    setWorkExperience(profile.workExperience);
    setLocation(profile.location);
    setTimezone(profile.timezone);
    setCareerGoals(profile.careerGoals);
    setLinkedinUrl(profile.linkedinUrl);
    setAvatarUrl(profile.avatarUrl ?? "");
    setResumeFileName(profile.resumeFileName ?? "");
    setResumePreviewUrl(profile.resumePreviewUrl ?? "");
    setState(initialState);
    setPhotoError(null);
    setResumeError(null);
  }

  function handleLocationChange(nextLocation: string) {
    setLocation(nextLocation);
    if (!nextLocation) {
      setTimezone("");
      return;
    }
    setTimezone(resolveTimezoneForLocation(nextLocation) ?? "");
  }

  function handleCancel() {
    resetForm();
    setIsEditing(false);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfileAction(state, formData);
      setState(result);
    });
  }

  async function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoPending(true);
    setPhotoError(null);

    const uploadData = new FormData();
    uploadData.append("avatar", file);
    const result = await uploadAvatarAction(uploadData);

    if (result.error) {
      setPhotoError(result.error);
    } else if (result.avatarUrl) {
      setAvatarUrl(result.avatarUrl);
    }

    setPhotoPending(false);
    event.target.value = "";
  }

  async function handleResumeSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumePending(true);
    setResumeError(null);

    const uploadData = new FormData();
    uploadData.append("resume", file);
    const result = await uploadProfileResumeAction(uploadData);

    if (result.error) {
      setResumeError(result.error);
    } else {
      setResumeFileName(result.fileName ?? file.name);
      if (result.resumeUrl) {
        setResumePreviewUrl(result.resumeUrl);
      }
    }

    setResumePending(false);
    event.target.value = "";
  }

  const readOnlyClass = !isEditing ? styles.readOnlyOverride : "";

  const nameFieldProps = {
    readOnly: !isEditing,
    className: `${styles.input} ${readOnlyClass}`,
    fieldClassName: styles.field,
    labelClassName: styles.label,
    errorClassName: styles.fieldError,
    inputErrorClassName: styles.inputError,
  };

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div className={styles.avatarWrap}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar URL
            <img src={avatarUrl} alt="" className={styles.avatarImage} />
          ) : (
            <div className={styles.avatarFallback}>
              {getInitials(displayName, profile.email)}
            </div>
          )}
        </div>

        <div className={styles.identity}>
          <p className={styles.displayName}>{displayName}</p>
          <p className={styles.metaLine}>{profile.email}</p>
          {profile.memberId ? (
            <div className={styles.metaRow}>
              <MemberIdBadge memberId={profile.memberId} size="sm" />
            </div>
          ) : null}
        </div>

        <div className={styles.heroActions}>
          {!isEditing ? (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setIsEditing(true)}
            >
              Edit profile
            </button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={styles.hiddenInput}
                onChange={handlePhotoSelect}
              />
              <button
                type="button"
                className={styles.photoBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={photoPending}
              >
                {photoPending ? "Uploading photo…" : avatarUrl ? "Change photo" : "Add photo"}
              </button>
              {photoError ? <p className={styles.fieldError}>{photoError}</p> : null}
            </>
          )}
        </div>
      </header>

      <form action={handleSubmit} className={styles.form}>
        <input type="hidden" name="avatarUrl" value={avatarUrl} />

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Personal details</h2>
          <div className={styles.cardBody}>
            <PersonNameFields
              rowClassName={styles.nameRow}
              firstName={{
                value: firstName,
                onChange: (event) => setFirstName(event.target.value),
                error: state.fieldErrors?.firstName,
                ...nameFieldProps,
              }}
              lastName={{
                value: lastName,
                onChange: (event) => setLastName(event.target.value),
                error: state.fieldErrors?.lastName,
                ...nameFieldProps,
              }}
            />

            <div className={styles.twoCol}>
              <div className={styles.field}>
                <label htmlFor="gender" className={styles.label}>
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  disabled={!isEditing}
                  className={`${styles.select} ${readOnlyClass} ${
                    state.fieldErrors?.gender ? styles.selectError : ""
                  }`}
                >
                  {CANDIDATE_GENDER_OPTIONS.map((option) => (
                    <option key={option.value || "unset"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {state.fieldErrors?.gender ? (
                  <p className={styles.fieldError}>{state.fieldErrors.gender}</p>
                ) : null}
              </div>

              <div className={styles.field}>
                <label htmlFor="graduationYear" className={styles.label}>
                  Graduated year
                </label>
                <input
                  id="graduationYear"
                  name="graduationYear"
                  type="number"
                  value={graduationYear}
                  onChange={(event) => setGraduationYear(event.target.value)}
                  placeholder="e.g. 2024"
                  readOnly={!isEditing}
                  className={fieldClass(isEditing, Boolean(state.fieldErrors?.graduationYear))}
                />
                {state.fieldErrors?.graduationYear ? (
                  <p className={styles.fieldError}>{state.fieldErrors.graduationYear}</p>
                ) : null}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="graduationCollege" className={styles.label}>
                Graduation college
              </label>
              <input
                id="graduationCollege"
                name="graduationCollege"
                value={graduationCollege}
                onChange={(event) => setGraduationCollege(event.target.value)}
                placeholder="e.g. State University"
                readOnly={!isEditing}
                className={fieldClass(isEditing, Boolean(state.fieldErrors?.graduationCollege))}
              />
              {state.fieldErrors?.graduationCollege ? (
                <p className={styles.fieldError}>{state.fieldErrors.graduationCollege}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="specialization" className={styles.label}>
                Specialization
              </label>
              <input
                id="specialization"
                name="specialization"
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                placeholder="e.g. Computer Science"
                readOnly={!isEditing}
                className={fieldClass(isEditing, Boolean(state.fieldErrors?.specialization))}
              />
              {state.fieldErrors?.specialization ? (
                <p className={styles.fieldError}>{state.fieldErrors.specialization}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="location" className={styles.label}>
                Location
              </label>
              <select
                id="location"
                name="location"
                value={location}
                onChange={(event) => handleLocationChange(event.target.value)}
                disabled={!isEditing}
                className={`${styles.select} ${readOnlyClass} ${
                  state.fieldErrors?.location ? styles.selectError : ""
                }`}
              >
                {CANDIDATE_LOCATION_OPTIONS.map((option) => (
                  <option key={option.value || "unset"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input type="hidden" name="timezone" value={timezone} />
              {state.fieldErrors?.location ? (
                <p className={styles.fieldError}>{state.fieldErrors.location}</p>
              ) : null}
              {state.fieldErrors?.timezone ? (
                <p className={styles.fieldError}>{state.fieldErrors.timezone}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Experience</h2>
          <div className={styles.cardBody}>
            <div className={styles.field}>
              <label htmlFor="experienceYears" className={styles.label}>
                Years of work experience
              </label>
              <input
                id="experienceYears"
                name="experienceYears"
                type="number"
                value={experienceYears}
                onChange={(event) => setExperienceYears(event.target.value)}
                placeholder="e.g. 2"
                readOnly={!isEditing}
                className={fieldClass(isEditing, Boolean(state.fieldErrors?.experienceYears))}
              />
              {state.fieldErrors?.experienceYears ? (
                <p className={styles.fieldError}>{state.fieldErrors.experienceYears}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="workExperience" className={styles.label}>
                Work experience summary
              </label>
              <textarea
                id="workExperience"
                name="workExperience"
                rows={3}
                value={workExperience}
                onChange={(event) => setWorkExperience(event.target.value)}
                placeholder="Internships, projects, or prior roles."
                readOnly={!isEditing}
                className={`${styles.textarea} ${readOnlyClass} ${
                  state.fieldErrors?.workExperience ? styles.textareaError : ""
                }`}
              />
              {state.fieldErrors?.workExperience ? (
                <p className={styles.fieldError}>{state.fieldErrors.workExperience}</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="careerGoals" className={styles.label}>
                Career goals
              </label>
              <textarea
                id="careerGoals"
                name="careerGoals"
                rows={3}
                value={careerGoals}
                onChange={(event) => setCareerGoals(event.target.value)}
                placeholder="What kind of role are you aiming for?"
                readOnly={!isEditing}
                className={`${styles.textarea} ${readOnlyClass} ${
                  state.fieldErrors?.careerGoals ? styles.textareaError : ""
                }`}
              />
              {state.fieldErrors?.careerGoals ? (
                <p className={styles.fieldError}>{state.fieldErrors.careerGoals}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Resume &amp; links</h2>
          <div className={styles.cardBody}>
            <div className={styles.uploadZone}>
              <p className={styles.uploadTitle}>Resume</p>
              <p className={styles.uploadHint}>
                PDF or Word, up to 5 MB. Visible to your mentor admin.
              </p>
              {resumeFileName ? (
                <p className={styles.uploadMeta}>
                  Current file: <strong>{resumeFileName}</strong>
                  {resumePreviewUrl ? (
                    <>
                      {" · "}
                      <a
                        href={resumePreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.uploadLink}
                      >
                        View
                      </a>
                    </>
                  ) : null}
                </p>
              ) : (
                <p className={styles.uploadMeta}>No resume uploaded yet.</p>
              )}
              <div className={styles.uploadActions}>
                <input
                  ref={resumeInputRef}
                  id="resume"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className={styles.hiddenInput}
                  onChange={handleResumeSelect}
                  disabled={resumePending}
                />
                <button
                  type="button"
                  className={styles.chooseFileBtn}
                  onClick={() => resumeInputRef.current?.click()}
                  disabled={resumePending}
                >
                  Choose file
                </button>
                {resumePending ? (
                  <span className={styles.uploadingLabel}>Uploading…</span>
                ) : null}
              </div>
              {resumeError ? <p className={styles.fieldError}>{resumeError}</p> : null}
            </div>

            <div className={styles.field}>
              <label htmlFor="linkedinUrl" className={styles.label}>
                LinkedIn URL
              </label>
              <input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                value={linkedinUrl}
                onChange={(event) => setLinkedinUrl(event.target.value)}
                placeholder="https://linkedin.com/in/your-profile"
                readOnly={!isEditing}
                className={fieldClass(isEditing, Boolean(state.fieldErrors?.linkedinUrl))}
              />
              {state.fieldErrors?.linkedinUrl ? (
                <p className={styles.fieldError}>{state.fieldErrors.linkedinUrl}</p>
              ) : null}
            </div>
          </div>
        </section>

        {state.error ? (
          <p role="alert" className={`${styles.alert} ${styles.alertError}`}>
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p role="status" className={`${styles.alert} ${styles.alertSuccess}`}>
            Profile updated successfully.
          </p>
        ) : null}

        {isEditing ? (
          <div className={styles.formFooter}>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </form>

      <Link href={backHref} className={styles.backLink}>
        ← {backLabel}
      </Link>
    </div>
  );
}
