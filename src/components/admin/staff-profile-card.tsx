"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import { FormField } from "@/components/auth/form-field";
import { PasswordField } from "@/components/auth/password-field";
import { PersonNameFields } from "@/components/auth/person-name-fields";
import { SubmitButton } from "@/components/auth/submit-button";
import type { UserProfile } from "@/lib/auth/profile";
import {
  updateStaffPasswordAction,
  updateStaffProfileAction,
  type StaffPasswordState,
  type StaffProfileState,
} from "@/server/actions/staff-profile";
import styles from "./staff-profile-card.module.css";

type StaffProfileCardProps = {
  profile: UserProfile;
  roleLabel: string;
  forcePassword?: boolean;
  showHeader?: boolean;
};

export function StaffProfileCard({
  profile,
  roleLabel,
  forcePassword = false,
  showHeader = true,
}: StaffProfileCardProps) {
  const router = useRouter();
  const [detailsState, setDetailsState] = useState<StaffProfileState>({});
  const [passwordState, setPasswordState] = useState<StaffPasswordState>({});
  const [detailsPending, startDetailsTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  function handleDetailsSubmit(formData: FormData) {
    startDetailsTransition(async () => {
      const result = await updateStaffProfileAction({}, formData);
      setDetailsState(result ?? {});
    });
  }

  function handlePasswordSubmit(formData: FormData) {
    startPasswordTransition(async () => {
      const result = await updateStaffPasswordAction({}, formData);
      setPasswordState(result ?? {});
      if (result?.clearedForcePassword) {
        router.replace("/admin");
        router.refresh();
      }
    });
  }

  return (
    <div className={styles.card}>
      {showHeader ? (
        <>
          <h1 className={styles.title}>
            Staff <em className={styles.titleEm}>profile</em>
          </h1>
          <p className={styles.subtitle}>
            Your {roleLabel.toLowerCase()} account details for the admin portal.
          </p>
        </>
      ) : null}

      {forcePassword ? (
        <div className={styles.forceBanner} role="status">
          <strong>Set a new password to continue.</strong>
          <span>
            Temporary passwords must be changed on first login before you can use
            the rest of the admin portal.
          </span>
        </div>
      ) : null}

      <dl className={styles.fieldList}>
        <div className={styles.field}>
          <dt className={styles.label}>Employee ID</dt>
          <dd>
            {profile.memberId ? (
              <MemberIdBadge memberId={profile.memberId} />
            ) : (
              <span className={styles.valueMuted}>Not assigned</span>
            )}
          </dd>
        </div>
        <div className={styles.field}>
          <dt className={styles.label}>Role</dt>
          <dd className={styles.value}>{roleLabel}</dd>
        </div>
        <div className={styles.field}>
          <dt className={styles.label}>Email</dt>
          <dd className={styles.value}>{profile.email}</dd>
        </div>
      </dl>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic details</h2>
        <form action={handleDetailsSubmit} className={styles.form}>
          <PersonNameFields
            firstName={{
              defaultValue: profile.firstName,
              error: detailsState.fieldErrors?.firstName,
            }}
            lastName={{
              defaultValue: profile.lastName,
              error: detailsState.fieldErrors?.lastName,
            }}
            rowClassName={styles.nameRow}
          />
          <FormField
            id="phone"
            name="phone"
            type="tel"
            label="Phone"
            placeholder="+1 555 123 4567"
            autoComplete="tel"
            defaultValue={profile.phone}
            error={detailsState.fieldErrors?.phone}
          />
          {detailsState.success ? (
            <p className={styles.success} role="status">
              {detailsState.success}
            </p>
          ) : null}
          {detailsState.error ? (
            <p className={styles.error} role="alert">
              {detailsState.error}
            </p>
          ) : null}
          <SubmitButton pending={detailsPending} pendingLabel="Saving…">
            Save details
          </SubmitButton>
        </form>
      </section>

      <section className={styles.section} id="change-password">
        <h2 className={styles.sectionTitle}>
          {forcePassword ? "Create your password" : "Change password"}
        </h2>
        <form action={handlePasswordSubmit} className={styles.form}>
          <PasswordField
            id="password"
            name="password"
            label="New password"
            autoComplete="new-password"
            error={passwordState.fieldErrors?.password}
          />
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            error={passwordState.fieldErrors?.confirmPassword}
          />
          {passwordState.success ? (
            <p className={styles.success} role="status">
              {passwordState.success}
            </p>
          ) : null}
          {passwordState.error ? (
            <p className={styles.error} role="alert">
              {passwordState.error}
            </p>
          ) : null}
          <SubmitButton pending={passwordPending} pendingLabel="Updating…">
            {forcePassword ? "Save password & continue" : "Update password"}
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
