/** Skeleton for the public share page while the blueprint loads. */
export default function ShareLoading() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    </div>
  );
}
