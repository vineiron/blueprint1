/** Skeleton mirroring the real dashboard (toolbar + card grid) so it streams without layout jump. */
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Toolbar: title on the left, search + sort + view toggle + filter chips on the right. */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="h-8 w-44 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-64" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-full flex-1 animate-pulse rounded-md bg-muted sm:w-40 sm:flex-none" />
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <div className="h-7 w-7 animate-pulse rounded bg-muted" />
                <div className="h-7 w-7 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {["w-16", "w-20", "w-20", "w-24"].map((w, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                key={i}
                className={`h-7 ${w} animate-pulse rounded-full bg-muted`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid: dashed "New blueprint" cell first, then card placeholders matching BlueprintCard. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border">
          <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          <div key={i} className="relative rounded-lg border border-border bg-card p-3">
            <div className="absolute right-2 bottom-2 h-8 w-8 animate-pulse rounded-md bg-muted" />
            <div className="mb-3 h-28 w-full animate-pulse rounded-md border border-border bg-muted" />
            <div className="pb-8">
              <div className="flex items-center gap-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-14 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
