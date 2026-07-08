import type { ErdModel } from "@/lib/sql/types";

/**
 * Text representation of the schema (plan H7 / P1). Used two ways:
 * - sr-only inside the canvas (screen-reader equivalent of the diagram), and
 * - visibly inside the share page's "Explain this schema" panel (also the SEO copy).
 * Mirrors the full detail the nodes can show. Pure markup (server-renderable).
 */
export function SchemaSummary({
  model,
  className,
}: {
  model: ErdModel;
  className?: string;
}) {
  if (model.tables.length === 0) return null;

  return (
    <section className={className} aria-label="Schema summary (text)">
      <h2 className="sr-only">Schema summary</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {model.tables.map((t) => (
          <div key={t.key} className="rounded-md border border-border bg-card p-2.5">
            <h3 className="font-mono text-[13px] font-semibold">{t.key}</h3>
            {t.comment ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{t.comment}</p>
            ) : null}
            <ul className="mt-1.5 space-y-0.5">
              {t.columns.map((c) => {
                const tags = [
                  c.pk ? "pk" : null,
                  c.fk && c.fkTarget
                    ? `→ ${c.fkTarget.table}.${c.fkTarget.column}` +
                      (c.fkTarget.onDelete ? ` (on delete ${c.fkTarget.onDelete})` : "")
                    : null,
                  !c.nullable && !c.pk ? "not null" : null,
                  c.nullable ? "null" : null,
                  c.unique && !c.pk ? "unique" : null,
                  c.default ? `default ${c.default}` : null,
                  c.check ? `check (${c.check})` : null,
                  c.enumValues?.length ? `enum: ${c.enumValues.join(", ")}` : null,
                ].filter(Boolean);
                return (
                  <li key={c.name} className="font-mono text-xs leading-relaxed">
                    <span className="text-foreground">{c.name}</span>{" "}
                    <span className="text-muted-foreground">{c.type}</span>
                    {tags.length > 0 ? (
                      <span className="text-muted-foreground"> · {tags.join(" · ")}</span>
                    ) : null}
                    {c.comment ? (
                      <span className="text-muted-foreground"> — {c.comment}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {t.indexes?.length ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Indexes:{" "}
                {t.indexes
                  .map((i) => `${i.unique ? "unique " : ""}(${i.columns.join(", ")})`)
                  .join("; ")}
              </p>
            ) : null}
            {t.checks?.length ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Checks: {t.checks.join("; ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {model.relations.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-muted-foreground">Relationships</h3>
          <ul className="mt-1 space-y-0.5">
            {model.relations.map((r) => {
              const from = r.columns ? r.columns.map((p) => p.from).join(", ") : r.fromColumn;
              const to = r.columns ? r.columns.map((p) => p.to).join(", ") : r.toColumn;
              return (
                <li key={r.id} className="font-mono text-xs text-muted-foreground">
                  {r.fromTable} ({from}) → {r.toTable} ({to}) · {r.cardinality}
                  {r.onDelete ? ` · on delete ${r.onDelete}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
