"use client";

import { useState } from "react";
import styles from "./welcome-page.module.css";

interface EmailCaptureFormProps {
  inputId: string;
  buttonLabel: string;
  className?: string;
}

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mdaveqoq";

export function EmailCaptureForm({ inputId, buttonLabel, className }: EmailCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [hasError, setHasError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setHasError(true);
      setTimeout(() => setHasError(false), 2000);
      return;
    }

    // Fire-and-forget, matching the original page's behavior — the success
    // message shows immediately rather than waiting on the network call.
    fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ email: trimmed }),
      headers: { "Content-Type": "application/json" },
    }).catch(() => {
      // Original page didn't handle this case either; the waitlist signal
      // is best-effort and a failed beacon shouldn't block the UI.
    });

    setSubmitted(true);
    setEmail("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <>
      <div className={`${styles.formWrap} ${hasError ? styles.formWrapError : ""} ${className ?? ""}`}>
        <input
          id={inputId}
          type="email"
          placeholder="Enter your email address"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className={styles.btnPrimary} onClick={handleSubmit}>
          {buttonLabel}
        </button>
      </div>
      {submitted && (
        <p className={`${styles.successMsg} ${styles.successMsgVisible}`}>
          &#x2713; You&#x2019;re on the list! We&#x2019;ll be in touch soon.
        </p>
      )}
    </>
  );
}
