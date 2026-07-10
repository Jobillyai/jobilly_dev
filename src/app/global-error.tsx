"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f6f6f4",
          color: "#111111",
        }}
      >
        <main style={{ maxWidth: "480px", padding: "24px", textAlign: "center" }}>
          <h1 style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 800 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.6, color: "#64748b" }}>
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "12px 20px",
              background: "#111111",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
