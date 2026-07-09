"use client";

import dynamic from "next/dynamic";
import type { ExportImageFormat } from "@/components/erd/export-image";
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
  showLegend = true,
  legendPlacement = "top-left",
  showExportControl = true,
  allowAutoLayout = false,
  exportRequest,
  onExportRequestHandled,
}: {
  model: ErdModel;
  positions: NodePositions;
  /** Render the sr-only schema summary. Off where the page already renders its own. */
  summary?: boolean;
  /** Show the cardinality legend on the canvas. */
  showLegend?: boolean;
  /** Place the cardinality legend on the canvas. */
  legendPlacement?: "top-left" | "beside-controls";
  /** Show the built-in export control on the canvas. */
  showExportControl?: boolean;
  /** Allow one-off relayout without making the viewer editable. */
  allowAutoLayout?: boolean;
  /** Parent-triggered export request; the canvas owns the rendered nodes. */
  exportRequest?: { id: number; format: ExportImageFormat } | null;
  onExportRequestHandled?: () => void;
}) {
  return (
    <ErdCanvas
      model={model}
      positions={positions}
      readOnly
      showSummary={summary}
      showLegend={showLegend}
      legendPlacement={legendPlacement}
      hideExportControl={!showExportControl}
      allowAutoLayout={allowAutoLayout}
      exportRequest={exportRequest}
      onExportRequestHandled={onExportRequestHandled}
    />
  );
}
