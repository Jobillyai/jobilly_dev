"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <main
      style={{
        margin: "0 auto",
        maxWidth: "480px",
        padding: "48px 24px",
        textAlign: "center",
        fontFamily: "var(--jb-font-sans, system-ui, sans-serif)",
        color: "var(--jb-ink, #1e1b4b)",
      }}
    >
      <h1 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 800 }}>
        Something went wrong
      </h1>
      <p style={{ margin: "0 0 24px", lineHeight: 1.6, color: "var(--jb-ink-muted, #64748b)" }}>
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          border: "none",
          borderRadius: "12px",
          padding: "12px 20px",
          background: "var(--jb-brand, #7c3aed)",
          color: "#ffffff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </main>
  );
}
