"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseSql } from "@/lib/sql/parser";
import { EMPTY_MODEL, type NodePositions } from "@/lib/sql/types";

// Lazy + client-only: keeps @xyflow/react + elkjs + CodeMirror out of the initial
// landing bundle. These chunks only fetch once the showcase is rendered, which is
// itself gated behind an IntersectionObserver below (so near-viewport).
const SqlEditor = dynamic(
  () => import("@/components/sql-editor").then((m) => m.SqlEditor),
  { ssr: false, loading: () => <PaneSkeleton label="Loading editor…" /> },
);
const ErdCanvas = dynamic(
  () => import("@/components/erd/erd-canvas").then((m) => m.ErdCanvas),
  { ssr: false, loading: () => <PaneSkeleton label="Laying out…" /> },
);

const SHOWCASE_SQL = `create type order_status as enum ('pending', 'paid');

create table customer (
  id     uuid primary key,
  email  text not null unique
);

create table product (
  id     uuid primary key,
  name   text not null
);

create table "order" (
  id           uuid primary key,
  customer_id  uuid not null references customer(id),
  status       order_status not null
);

create table order_item (
  order_id    uuid references "order"(id),
  product_id  uuid references product(id),
  quantity    integer not null
);`;

function PaneSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

// Plain (uncolored) pre-load / no-JS fallback for the editor pane. The real
// CodeMirror editor (with syntax highlighting) swaps in once its chunk loads.
function StaticCodeFallback() {
  const lineCount = SHOWCASE_SQL.split("\n").length;
  return (
    <div className="flex h-full font-mono text-[11px] leading-[1.7]">
      <div
        aria-hidden="true"
        className="shrink-0 select-none border-r border-border bg-muted px-2.5 py-3 text-right tabular-nums text-muted-foreground"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="flex-1 overflow-auto px-3 py-3 text-foreground">
        {SHOWCASE_SQL}
      </pre>
    </div>
  );
}

/**
 * Live miniature of /try inside the landing hero: the REAL CodeMirror editor
 * (read-only, showing the sample schema) beside the REAL ERD canvas — rendered
 * with the same core configuration /try uses, so the diagram carries the same
 * density / auto-layout controls, zoom controls, and the same
 * pan / zoom / drag / click-to-focus interactions. The canvas owns its position
 * state here so dragged tables stay put. Both heavy chunks (@xyflow, elkjs,
 * CodeMirror) are gated behind an IntersectionObserver so they only load once
 * the showcase nears the viewport.
 */
export function ShowcaseLive() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [positions, setPositions] = useState<NodePositions>({});

  const model = useMemo(() => {
    const result = parseSql(SHOWCASE_SQL);
    return result.ok ? result.model : EMPTY_MODEL;
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="grid items-stretch gap-4 xl:grid-cols-[520px_auto_minmax(0,1fr)]"
    >
      {/* Code editor — compact. Full-width when stacked (below xl); fixed at
          520px when side-by-side (xl+) so the sample never scrolls
          horizontally. */}
      <div className="h-72 overflow-hidden rounded-md border border-input bg-card sm:h-80 xl:h-[32rem]">
        {mounted ? (
          <SqlEditor value={SHOWCASE_SQL} readOnly diagnostic={null} />
        ) : (
          <StaticCodeFallback />
        )}
      </div>

      <span
        aria-hidden="true"
        className="hidden self-center text-2xl text-muted-foreground xl:block"
      >
        →
      </span>

      {/* ERD canvas — the real /try canvas: same toolbar, controls, and full
          interactivity. The star of the showcase; takes the remaining width when
          side-by-side. */}
      <div className="h-96 overflow-hidden rounded-md border border-border bg-card sm:h-[28rem] xl:h-[32rem]">
        {mounted ? (
          <ErdCanvas
            model={model}
            positions={positions}
            onPositionsChange={setPositions}
            showLegend={false}
            autoLayoutFirst
            hideExportControl
          />
        ) : (
          <PaneSkeleton label="Laying out…" />
        )}
      </div>
    </div>
  );
}
