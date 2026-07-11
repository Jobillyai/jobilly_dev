"use client";

import { useMemo } from "react";
import {
  formatDateTimeLocalValue,
  getBookingWindow,
} from "@/lib/career-advisory/booking-window";
import authStyles from "@/components/auth/auth-page.module.css";
import styles from "./career-advisory-form.module.css";

type SessionBookingPickerProps = {
  error?: string;
  defaultValue?: string;
};

export function SessionBookingPicker({ error, defaultValue }: SessionBookingPickerProps) {
  const { min, max } = useMemo(() => getBookingWindow(), []);

  return (
    <div className={authStyles.field}>
      <label htmlFor="sessionScheduledAt" className={authStyles.label}>
        Preferred session date & time (US Eastern)
      </label>
      <p className={styles.fieldHint}>
        Pick a slot within the next 2 days in US Eastern Time (ET). A Google Meet
        invite will be sent for your chosen time.
      </p>
      <input
        id="sessionScheduledAt"
        name="sessionScheduledAt"
        type="datetime-local"
        required
        min={formatDateTimeLocalValue(min)}
        max={formatDateTimeLocalValue(max)}
        defaultValue={defaultValue}
        className={`${styles.dateTimeInput} ${
          error ? styles.dateTimeInputError : ""
        }`}
        aria-invalid={!!error}
      />
      {error && <p className={authStyles.fieldError}>{error}</p>}
    </div>
  );
}
