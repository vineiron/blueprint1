/** Skeleton for the public share page while the blueprint loads. */
export default function ShareLoading() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-live="polite">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
          <div className="ml-auto flex items-center gap-2">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-muted sm:w-36" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:min-h-10 sm:flex-row sm:items-center">
          <div className="min-w-0 space-y-1.5">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 max-w-[70vw] animate-pulse rounded bg-muted" />
          </div>

          <div className="-mx-1 flex w-full items-center justify-end gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:ml-auto sm:w-auto sm:justify-start sm:overflow-visible sm:px-0 sm:pb-0">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-muted lg:w-20" />
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-muted lg:w-20" />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted/40 px-4 py-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex shrink-0 border-b border-border bg-card">
          <div className="flex-1 border-b-2 border-primary px-3 py-2">
            <div className="mx-auto h-4 w-8 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex-1 border-b-2 border-transparent px-3 py-2">
            <div className="mx-auto h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="min-h-0 flex-1 p-2">
          <div className="h-full rounded-md border border-input bg-card p-3">
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 grid-cols-[40%_0.375rem_minmax(0,1fr)] md:grid">
        <div className="min-h-0 min-w-0 p-2">
          <div className="h-full rounded-md border border-input bg-card p-3">
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="bg-border" aria-hidden />
        <div className="flex min-h-0 flex-1 items-center justify-center bg-diagram-grid">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      </div>
    </div>
  );
}
