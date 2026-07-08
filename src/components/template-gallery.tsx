import { TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";

/** Compact template picker for the editor empty state (/try + New editor). */
export function TemplateGallery({
  onPick,
  className,
}: {
  onPick: (sql: string, name: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground">
        Start from a template
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t.sql, t.name)}
            title={t.description}
            className="focus-ring min-w-28 rounded-md border border-border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-muted"
          >
            <span className="block text-sm font-medium text-foreground">{t.name}</span>
            <span className="block text-xs text-muted-foreground">{t.tableCount} tables</span>
          </button>
        ))}
      </div>
    </div>
  );
}
