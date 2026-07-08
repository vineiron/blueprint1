import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlueprintViewer } from "@/components/blueprint-viewer";
import { CopyButton } from "@/components/copy-button";
import { SchemaSummary } from "@/components/schema-summary";
import { EyeIcon, KeyIcon, LinkIcon, SparklesIcon } from "@/components/ui/icons";
import { BrandLockup } from "@/components/ui/brand-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getPublicBlueprint } from "@/server/data/blueprints";
import { formatRelativeTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blueprint = await getPublicBlueprint(slug);
  if (!blueprint) return { title: "Blueprint not found" };
  const { tables, relations } = blueprint.graph;
  return {
    title: blueprint.title,
    description: `Entity-relationship blueprint — ${tables.length} tables, ${relations.length} relationships.`,
    openGraph: { title: blueprint.title, type: "website" },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blueprint = await getPublicBlueprint(slug);
  if (!blueprint) notFound();

  const tableCount = blueprint.graph.tables.length;
  const relationCount = blueprint.graph.relations.length;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Link href="/">
          <BrandLockup />
        </Link>
        <div className="mx-2 hidden h-5 w-px bg-border sm:block" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{blueprint.title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            <EyeIcon size={11} className="mr-1 inline" />
            Read-only
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {/* Convert read-only viewers into creators — straight into the no-signup playground. */}
          <Link
            href="/try"
            className="focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <SparklesIcon size={15} />
            <span className="hidden sm:inline">Make your own blueprint</span>
            <span className="sm:hidden">Make your own</span>
          </Link>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {/* summary={false}: the Explain panel below holds the server-rendered text copy. */}
        <BlueprintViewer
          model={blueprint.graph}
          positions={blueprint.positions}
          summary={false}
        />
      </div>

      {/* Self-explanatory footer: stats + legend + Explain + View SQL (all SSR). */}
      <aside className="shrink-0 border-t border-border bg-card">
        <div className="mx-auto w-full max-w-5xl px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {tableCount} table{tableCount === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>
              {relationCount} relationship{relationCount === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <span>Updated {formatRelativeTime(blueprint.updatedAt)}</span>
            <ShareLegend />
          </div>

          <div className="mt-2 space-y-2">
            <details className="rounded-md border border-border">
              <summary className="focus-ring cursor-pointer list-none px-3 py-2 text-sm font-medium hover:bg-muted">
                Explain this schema
              </summary>
              <div className="max-h-[42vh] overflow-auto border-t border-border p-3">
                <SchemaSummary model={blueprint.graph} />
              </div>
            </details>

            <details className="rounded-md border border-border">
              <summary className="focus-ring cursor-pointer list-none px-3 py-2 text-sm font-medium hover:bg-muted">
                View SQL
              </summary>
              <div className="border-t border-border p-3">
                <div className="mb-2 flex justify-end">
                  <CopyButton text={blueprint.sql} label="Copy SQL" />
                </div>
                <pre className="max-h-[42vh] overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                  {blueprint.sql}
                </pre>
              </div>
            </details>
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Compact legend decoding the node glyphs/badges for non-expert viewers. */
function ShareLegend() {
  return (
    <span className="ml-auto hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex">
      <span className="inline-flex items-center gap-1">
        <KeyIcon size={12} className="text-pk" /> primary key
      </span>
      <span className="inline-flex items-center gap-1">
        <LinkIcon size={12} className="text-fk" /> foreign key
      </span>
      <span>
        <LegendChip>NN</LegendChip> not null
      </span>
      <span>
        <LegendChip>UQ</LegendChip> unique
      </span>
      <span>
        <LegendChip>ENUM</LegendChip> enum
      </span>
    </span>
  );
}

function LegendChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1 text-[9px] font-semibold uppercase text-muted-foreground">
      {children}
    </span>
  );
}
