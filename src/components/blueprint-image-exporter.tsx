"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from "@xyflow/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { buildEdges, buildNodes } from "@/components/erd/build-graph";
import { DensityContext } from "@/components/erd/density";
import { ErdMarkerDefs } from "@/components/erd/erd-markers";
import {
  downloadFlowImage,
  type ExportImageFormat,
} from "@/components/erd/export-image";
import { layoutGraph } from "@/components/erd/layout";
import { RoutedEdge } from "@/components/erd/routed-edge";
import { TableNode, type TableNodeData } from "@/components/erd/table-node";
import type { ErdModel, NodePositions } from "@/lib/sql/types";

const nodeTypes = { table: TableNode };
const edgeTypes = { routed: RoutedEdge };

export interface ExportImageRequest {
  model: ErdModel;
  positions: NodePositions;
  format: ExportImageFormat;
  filename: string;
}

/**
 * Inner flow (inside ReactFlowProvider) that mounts the diagram, waits until
 * every node is measured, then captures it once. Mirrors how `erd-canvas`
 * places nodes: use stored positions when present, otherwise auto-layout.
 */
function CaptureFlow({
  request,
  containerRef,
  onDone,
}: {
  request: ExportImageRequest;
  containerRef: RefObject<HTMLDivElement | null>;
  onDone: (error?: string) => void;
}) {
  const { getNodes } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const [nodes, setNodes] = useState<Node<TableNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const firedRef = useRef(false);
  // Read the latest onDone without listing it as an effect dep — keeps the
  // capture effect from re-running (and cancelling its own rAFs) on re-render.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Build nodes/edges once. When no positions are stored, auto-layout (the same
  // ELK pass the live canvas runs) so the export still looks arranged.
  useEffect(() => {
    let cancelled = false;
    const baseNodes = buildNodes(request.model, request.positions);
    const baseEdges = buildEdges(request.model);
    const missing = baseNodes.filter((n) => !request.positions[n.id]);

    if (baseNodes.length > 0 && missing.length === baseNodes.length) {
      layoutGraph(baseNodes, baseEdges)
        .then(({ nodes: laid, edges: routed }) => {
          if (cancelled) return;
          setNodes(laid);
          setEdges(routed);
        })
        .catch(() => {
          if (cancelled) return;
          // Fallback cascade so something always renders.
          setNodes(
            baseNodes.map((n, i) => ({ ...n, position: { x: 60 + i * 48, y: 60 + i * 48 } })),
          );
          setEdges(baseEdges);
        });
    } else {
      // Keep stored positions; cascade-place the rare unpositioned newcomer.
      let i = 0;
      setNodes(
        baseNodes.map((n) =>
          request.positions[n.id] ? n : { ...n, position: { x: 60 + i * 48, y: 60 + i++ * 48 } },
        ),
      );
      setEdges(baseEdges);
    }
    return () => {
      cancelled = true;
    };
  }, [request]);

  // Capture exactly once, after nodes are mounted and measured. Two animation
  // frames let edges paint against the freshly measured handle positions. Deps
  // are only the readiness signals (request/getNodes/containerRef are stable for
  // the component's life; onDone is read via ref) so a parent re-render can't
  // re-run this effect and cancel an in-flight capture — which would otherwise
  // strand the export with onDone never called.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fires once on readiness; other refs are stable
  useEffect(() => {
    if (firedRef.current || nodes.length === 0 || !nodesInitialized) return;
    firedRef.current = true;
    const container = containerRef.current;
    if (!container) {
      onDoneRef.current("Export failed.");
      return;
    }
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        downloadFlowImage({
          root: container,
          nodes: getNodes(),
          format: request.format,
          filename: request.filename,
        })
          .then(() => onDoneRef.current())
          .catch((e) => onDoneRef.current(e instanceof Error ? e.message : "Export failed."));
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [nodes.length, nodesInitialized]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      // Render ALL nodes (no viewport culling) so off-screen tables are present
      // in the DOM for the capture.
      onlyRenderVisibleElements={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--diagram-grid)" gap={22} size={1} />
    </ReactFlow>
  );
}

/**
 * Renders a blueprint's diagram in a fixed-size, off-screen canvas purely to
 * capture it as a PNG/SVG, then calls `onDone`. The dashboard mounts this on
 * demand (lazily) when a user picks Export, and unmounts it once finished.
 */
export function BlueprintImageExporter({
  request,
  onDone,
}: {
  request: ExportImageRequest;
  onDone: (error?: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={containerRef}
      aria-hidden
      // `inert` keeps React Flow's focusable node/edge wrappers out of the tab
      // order while this transient subtree is mounted.
      inert
      // Off-screen via fixed positioning (kept out of layout/scroll); full export
      // size so React Flow measures real node dimensions.
      style={{
        position: "fixed",
        left: "-10000px",
        top: 0,
        width: "1600px",
        height: "1000px",
        pointerEvents: "none",
      }}
    >
      <DensityContext.Provider value="full">
        <ErdMarkerDefs />
        <ReactFlowProvider>
          <CaptureFlow request={request} containerRef={containerRef} onDone={onDone} />
        </ReactFlowProvider>
      </DensityContext.Provider>
    </div>
  );
}
