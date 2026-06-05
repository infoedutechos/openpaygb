"use client";

import { useEffect } from "react";

/**
 * Root error boundary (replaces root layout when triggered). Must include html/body.
 */
export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui,sans-serif", background: "#0f172a", color: "#e2e8f0" }}>
        <div style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Application error</h1>
          <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: "0.5rem" }}>
            An unexpected error occurred. Please refresh or try again later.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: 12,
              border: "none",
              background: "#0891b2",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
