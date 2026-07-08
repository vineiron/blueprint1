"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutIcon } from "@/components/ui/icons";
import { parseSql } from "@/lib/sql/parser";
import { EMPTY_MODEL } from "@/lib/sql/types";

// Lazy + client-only: the heavy @xyflow/react + elkjs chunks load only once the
// demo scrolls near the viewport (it sits well down the landing page).
const ErdCanvas = dynamic(
  () => import("@/components/erd/erd-canvas").then((m) => m.ErdCanvas),
  { ssr: false, loading: () => <Skeleton /> },
);

const DEMO_SQL = `create table users (
  id uuid primary key,
  email text not null unique
);

create table orders (
  id uuid primary key,
  user_id uuid not null references users(id),
  total numeric not null
);

create table order_items (
  order_id uuid references orders(id),
  product text not null
);`;

function Skeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      Laying out…
    </div>
  );
}

/**
 * Auto-layout feature demo: the REAL ErdCanvas (not a hand-built mockup),
 * embedded and display-only. On first view the tables drop in and the layout
 * engine arranges them — the actual auto-layout in action — and the button
 * replays it by remounting. Because it renders the same component /try uses,
 * the visual can never drift from the real product.
 */
export function AutoLayoutDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [layoutKey, setLayoutKey] = useState(0);

  const model = useMemo(() => {
    const r = parseSql(DEMO_SQL);
    return r.ok ? r.model : EMPTY_MODEL;
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
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div className="al-demo-canvas h-72 overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-border sm:h-80">
        {mounted ? (
          <ErdCanvas
            key={layoutKey}
            model={model}
            positions={{}}
            readOnly
            embedded
            density="standard"
            showLegend={false}
            showSummary={false}
            hideExportControl
          />
        ) : (
          <Skeleton />
        )}
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setLayoutKey((k) => k + 1)}
          className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium shadow-sm hover:bg-muted"
        >
          <LayoutIcon size={16} />
          Auto layout
        </button>
      </div>
    </div>
  );
}
