"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import authStyles from "./auth-page.module.css";
import {
  PHONE_COUNTRIES,
  splitPhoneNumber,
  type PhoneCountry,
} from "@/lib/format-phone";
import { PhoneCountryFlag } from "./phone-country-flag";
import styles from "./phone-field.module.css";

type PhoneFieldProps = {
  defaultPhone?: string;
  error?: string;
  label?: string;
  placeholder?: string;
};

export function PhoneField({
  defaultPhone = "",
  error,
  label = "Phone number",
  placeholder = "555 123 4567",
}: PhoneFieldProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const parsed = splitPhoneNumber(defaultPhone);
  const [country, setCountry] = useState<PhoneCountry>(parsed.country);
  const [open, setOpen] = useState(false);

  const selected = PHONE_COUNTRIES.find((option) => option.code === country)!;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function selectCountry(nextCountry: PhoneCountry) {
    setCountry(nextCountry);
    setOpen(false);
  }

  return (
    <div className={authStyles.field}>
      <label htmlFor="phone" className={authStyles.label}>
        {label}
      </label>

      <div
        className={`${styles.phoneGroup} ${error ? styles.phoneGroupError : ""}`}
      >
        <input type="hidden" name="phoneCountry" value={country} />

        <div ref={rootRef} className={styles.countryPicker}>
          <button
            type="button"
            className={styles.countryTrigger}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-label={`Country code ${selected.label} ${selected.dialCode}`}
            onClick={() => setOpen((value) => !value)}
          >
            <PhoneCountryFlag country={country} className={styles.flagIcon} />
            <span className={styles.countryDial}>{selected.dialCode}</span>
            <ChevronDown size={14} className={styles.countryChevron} aria-hidden />
          </button>

          {open ? (
            <ul id={listboxId} className={styles.countryMenu} role="listbox">
              {PHONE_COUNTRIES.map((option) => (
                <li key={option.code} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.code === country}
                    className={`${styles.countryOption} ${
                      option.code === country ? styles.countryOptionActive : ""
                    }`}
                    onClick={() => selectCountry(option.code)}
                  >
                    <PhoneCountryFlag country={option.code} className={styles.flagIcon} />
                    <span className={styles.countryOptionText}>
                      <span className={styles.countryLabel}>{option.label}</span>
                      <span className={styles.countryDial}>{option.dialCode}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <span className={styles.phoneDivider} aria-hidden />

        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          defaultValue={parsed.localNumber}
          className={styles.phoneInput}
          aria-invalid={!!error}
          aria-describedby={error ? "phone-error" : undefined}
        />
      </div>

      {error ? (
        <p id="phone-error" className={authStyles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
