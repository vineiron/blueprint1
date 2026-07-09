function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-muted ${className}`} />;
}

const FILTER_CHIP_SKELETONS = [
  { key: "all", width: "w-16" },
  { key: "public", width: "w-20" },
  { key: "private", width: "w-20" },
  { key: "draft", width: "w-24" },
];

const CARD_SKELETONS = ["card-1", "card-2", "card-3", "card-4", "card-5"];

function NewBlueprintSkeleton() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary text-primary">
      <SkeletonBlock className="h-[22px] w-[22px] rounded-full" />
      <SkeletonBlock className="h-5 w-24 rounded" />
    </div>
  );
}

function BlueprintCardSkeleton() {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-3">
      <SkeletonBlock className="mb-3 h-28 w-full overflow-hidden rounded-md border border-border" />

      <div className="min-w-0 flex-1 pb-8">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-5 w-2/3 rounded" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <SkeletonBlock className="h-4 w-14 rounded" />
          <SkeletonBlock className="h-1 w-1 rounded-full" />
          <SkeletonBlock className="h-4 w-16 rounded" />
        </div>
      </div>

      <div className="absolute bottom-2 left-3 z-10 flex flex-wrap items-center gap-1.5 pr-12">
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-12 rounded-full" />
      </div>

      <div className="absolute right-2 bottom-2 z-10">
        <SkeletonBlock className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

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
          <SkeletonBlock className="h-8 w-44 rounded-md" />
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SkeletonBlock className="h-9 w-full rounded-md sm:w-64" />
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-9 w-full flex-1 rounded-md sm:w-40 sm:flex-none" />
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <SkeletonBlock className="h-7 w-7 rounded" />
                <SkeletonBlock className="h-7 w-7 rounded" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {FILTER_CHIP_SKELETONS.map((chip) => (
              <div
                key={chip.key}
                className={`h-7 ${chip.width} animate-pulse rounded-full bg-muted`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid: dashed "New blueprint" cell first, then card placeholders matching BlueprintCard. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NewBlueprintSkeleton />
        {CARD_SKELETONS.map((key) => (
          <BlueprintCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}
