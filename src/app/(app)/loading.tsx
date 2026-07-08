/** Default skeleton for authenticated routes while the RSC payload streams in. */
export default function AppLoading() {
  return (
    <div className="flex h-full items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}
