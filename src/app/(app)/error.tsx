"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Recoverable error boundary for authenticated routes (editor, dashboard,
 * history). `reset()` re-renders the segment so a transient failure (e.g. a
 * dropped DB connection) doesn't strand the user.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced to the browser console; server-side logging is centralized in actions.
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred while loading this page. You can try again.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
