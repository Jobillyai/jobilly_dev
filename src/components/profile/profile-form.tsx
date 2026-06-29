"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  updateProfileAction,
  uploadAvatarAction,
  type ProfileState,
} from "@/server/actions/profile";
import { PersonNameFields } from "@/components/auth/person-name-fields";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import type { UserProfile } from "@/lib/auth/profile";
import { combineFirstLastName } from "@/lib/format-person-name";
import authStyles from "@/components/auth/auth-page.module.css";
import styles from "./profile-form.module.css";

type ProfileFormProps = {
  profile: UserProfile;
  backHref?: "/dashboard" | "/admin";
  backLabel?: string;
};

const initialState: ProfileState = {};

function combineDisplayName(firstName: string, lastName: string) {
  return combineFirstLastName(firstName, lastName);
}

function getInitials(name: string | undefined, email: string) {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileForm({
  profile,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: ProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [state, setState] = useState<ProfileState>(initialState);
  const [pending, startTransition] = useTransition();
  const [photoPending, setPhotoPending] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [education, setEducation] = useState(profile.education);
  const [experienceYears, setExperienceYears] = useState(
    profile.experienceYears?.toString() ?? "",
  );
  const [careerGoals, setCareerGoals] = useState(profile.careerGoals);
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");

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
    setEducation(profile.education);
    setExperienceYears(profile.experienceYears?.toString() ?? "");
    setCareerGoals(profile.careerGoals);
    setLinkedinUrl(profile.linkedinUrl);
    setAvatarUrl(profile.avatarUrl ?? "");
    setState(initialState);
    setPhotoError(null);
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
    if (!file) {
      return;
    }

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

  const inputClassName = !isEditing ? styles.readOnlyField : undefined;
  const textareaClassName = !isEditing
    ? `${styles.textarea} ${styles.readOnlyField}`
    : styles.textarea;

  return (
    <>
      <div className={styles.headerRow}>
        <div className={authStyles.header}>
          <h1 className={authStyles.title}>
            Your <em className={authStyles.titleEm}>profile</em>
          </h1>
          <p className={authStyles.subtitle}>
            {isEditing
              ? "Update your photo and details, then save your changes."
              : "Click the edit icon to update your photo and details."}
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            className={styles.editIconBtn}
            onClick={() => setIsEditing(true)}
            aria-label="Edit profile"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 20H8L18.5 9.5L14.5 5.5L4 16V20Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M13.5 6.5L17.5 10.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.avatarSection}>
        <div className={styles.avatarWrap}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar URL
            <img src={avatarUrl} alt="" className={styles.avatarImage} />
          ) : (
            <div className={styles.avatarFallback}>
              {getInitials(
                combineDisplayName(firstName, lastName),
                profile.email,
              )}
            </div>
          )}
        </div>

        {isEditing && (
          <div className={styles.avatarActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className={styles.hiddenFileInput}
              onChange={handlePhotoSelect}
            />
            <button
              type="button"
              className={styles.photoBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={photoPending}
            >
              {photoPending
                ? "Uploading…"
                : avatarUrl
                  ? "Change photo"
                  : "Add photo"}
            </button>
            {photoError && <p className={authStyles.fieldError}>{photoError}</p>}
          </div>
        )}
      </div>

      <form action={handleSubmit} className={authStyles.form}>
        <input type="hidden" name="avatarUrl" value={avatarUrl} />

        <PersonNameFields
          firstName={{
            value: firstName,
            onChange: (event) => setFirstName(event.target.value),
            readOnly: !isEditing,
            className: inputClassName,
            error: state.fieldErrors?.firstName,
          }}
          lastName={{
            value: lastName,
            onChange: (event) => setLastName(event.target.value),
            readOnly: !isEditing,
            className: inputClassName,
            error: state.fieldErrors?.lastName,
          }}
        />

        <div className={authStyles.field}>
          <label htmlFor="email" className={authStyles.label}>
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={profile.email}
            readOnly
            className={`${authStyles.input} ${styles.readOnlyInput}`}
          />
        </div>

        <FormField
          id="education"
          name="education"
          label="Education"
          value={education}
          onChange={(event) => setEducation(event.target.value)}
          placeholder="e.g. B.S. Computer Science, State University"
          readOnly={!isEditing}
          className={inputClassName}
          error={state.fieldErrors?.education}
        />

        <FormField
          id="experienceYears"
          name="experienceYears"
          type="number"
          label="Years of experience"
          value={experienceYears}
          onChange={(event) => setExperienceYears(event.target.value)}
          placeholder="e.g. 2"
          readOnly={!isEditing}
          className={inputClassName}
          error={state.fieldErrors?.experienceYears}
        />

        <div className={authStyles.field}>
          <label htmlFor="careerGoals" className={authStyles.label}>
            Career goals
          </label>
          <textarea
            id="careerGoals"
            name="careerGoals"
            rows={4}
            value={careerGoals}
            onChange={(event) => setCareerGoals(event.target.value)}
            placeholder="What kind of role are you aiming for?"
            readOnly={!isEditing}
            className={textareaClassName}
          />
          {state.fieldErrors?.careerGoals && (
            <p className={authStyles.fieldError}>{state.fieldErrors.careerGoals}</p>
          )}
        </div>

        <FormField
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          label="LinkedIn URL"
          value={linkedinUrl}
          onChange={(event) => setLinkedinUrl(event.target.value)}
          placeholder="https://linkedin.com/in/your-profile"
          readOnly={!isEditing}
          className={inputClassName}
          error={state.fieldErrors?.linkedinUrl}
        />

        {state.error && (
          <p role="alert" className={authStyles.alert}>
            {state.error}
          </p>
        )}

        {state.success && (
          <p role="status" className={styles.success}>
            Profile updated successfully.
          </p>
        )}

        {isEditing && (
          <div className={styles.actionRow}>
            <SubmitButton pending={pending} pendingLabel="Saving…">
              Save changes
            </SubmitButton>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        )}
      </form>

      <p className={authStyles.footer}>
        <Link href={backHref} className={authStyles.footerLink}>
          {backLabel}
        </Link>
      </p>
    </>
  );
}
