"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

/**
 * Last-resort boundary that replaces the root layout when rendering itself fails.
 * Must render its own <html>/<body>; styles are inlined so it works even if the
 * stylesheet is the thing that broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
            A critical error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              height: 40,
              padding: "0 20px",
              borderRadius: 6,
              border: "none",
              background: "#0284c7",
              color: "#fff",
              fontWeight: 500,
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
