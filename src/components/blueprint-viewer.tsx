"use client";

import dynamic from "next/dynamic";
import type { ErdModel, NodePositions } from "@/lib/sql/types";

// Heavy React Flow canvas: load client-side only with a sized skeleton (H11).
const ErdCanvas = dynamic(
  () => import("@/components/erd/erd-canvas").then((m) => m.ErdCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-diagram-grid">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    ),
  },
);

export function BlueprintViewer({
  model,
  positions,
  summary = true,
}: {
  model: ErdModel;
  positions: NodePositions;
  /** Render the sr-only schema summary. Off where the page already renders its own. */
  summary?: boolean;
}) {
  return <ErdCanvas model={model} positions={positions} readOnly showSummary={summary} />;
}
