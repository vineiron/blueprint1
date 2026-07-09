"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  type Edge,
  type EdgeMouseHandler,
  getConnectedEdges,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  CodeIcon,
  DatabaseIcon,
  DownloadIcon,
  ImageIcon,
  LayoutIcon,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { SchemaSummary } from "@/components/schema-summary";
import type { ErdModel, NodePositions } from "@/lib/sql/types";
import { cn } from "@/lib/utils";
import { buildEdges, buildNodes } from "./build-graph";
import { downloadFlowImage } from "./export-image";
import { HEADER_HEIGHT, NODE_WIDTH, ROW_HEIGHT } from "./geometry";
import { type Density, DENSITY_LABEL, DENSITY_ORDER, DensityContext } from "./density";
import { ErdLegend, ErdMarkerDefs } from "./erd-markers";
import { layoutGraph } from "./layout";
import { RoutedEdge } from "./routed-edge";
import { TableNode, type TableNodeData } from "./table-node";

const DENSITY_STORAGE_KEY = "blueprint-density";

const nodeTypes = { table: TableNode };
const edgeTypes = { routed: RoutedEdge };

function modelSignature(model: ErdModel): string {
  return JSON.stringify({
    t: model.tables.map((t) => [t.key, t.columns.map((c) => c.name)]),
    r: model.relations.map((r) => [r.id, r.fromColumn, r.toColumn]),
  });
}

interface ErdCanvasProps {
  model: ErdModel;
  positions: NodePositions;
  readOnly?: boolean;
  /** Pin the detail level (overrides the readOnly/editor default and skips the
   *  persisted preference). Used by the marketing showcase to render at the same
   *  default density a fresh /try visitor sees. */
  density?: Density;
  /** Embedded read-only display (e.g. the marketing showcase) in a small,
   *  fixed-height box: renders all nodes (no viewport culling) and refits once
   *  nodes are measured, so off-initial-viewport tables can't be culled before
   *  fitView runs. Leave false for the full-size editor/share/version views. */
  embedded?: boolean;
  /** Hide the cardinality legend (one / many / optional). The marketing showcase
   *  hides it to declutter; the editor / share / version views keep it. */
  showLegend?: boolean;
  /** Tablet editor can move the legend beside React Flow's zoom controls. */
  legendPlacement?: "top-left" | "beside-controls";
  /** Render the Auto layout button before Export in the top-right toolbar. Used
   *  by the marketing showcase; defaults to Export-first everywhere else. */
  autoLayoutFirst?: boolean;
  /** Hide the built-in export button when a parent toolbar owns that action. */
  hideExportControl?: boolean;
  /** Allow one-off relayout without making the canvas editable. */
  allowAutoLayout?: boolean;
  /** Parent-triggered export request; the canvas owns the rendered nodes. */
  exportRequest?: { id: number; format: "png" | "svg" } | null;
  onExportRequestHandled?: () => void;
  onPositionsChange?: (positions: NodePositions) => void;
  /** Optional CTA shown in the empty state (e.g. the starter-template picker). */
  emptyAction?: ReactNode;
  /** Optional floating notice pinned to the top-center of the canvas, above the
   *  diagram (e.g. the "previewing a template" revert chip). */
  notice?: ReactNode;
}

function Flow({
  model,
  positions,
  readOnly = false,
  density: pinnedDensity,
  embedded = false,
  showLegend = true,
  legendPlacement = "top-left",
  autoLayoutFirst = false,
  hideExportControl = false,
  allowAutoLayout = false,
  exportRequest,
  onExportRequestHandled,
  onPositionsChange,
  emptyAction,
  notice,
}: ErdCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [layouting, setLayouting] = useState(false);
  // Shared viewers default to "full" (communicate everything); the editor restores
  // the last-used level. Both can change it via the on-canvas control.
  const [density, setDensity] = useState<Density>(
    pinnedDensity ?? (readOnly ? "full" : "standard"),
  );

  useEffect(() => {
    if (readOnly || pinnedDensity) return;
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY) as Density | null;
    if (saved && DENSITY_ORDER.includes(saved)) setDensity(saved);
  }, [readOnly, pinnedDensity]);

  const changeDensity = (d: Density) => {
    setDensity(d);
    if (!readOnly) {
      try {
        window.localStorage.setItem(DENSITY_STORAGE_KEY, d);
      } catch {
        // ignore storage failures (private mode, etc.)
      }
    }
  };
  const { fitView, fitBounds } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const { toast } = useToast();
  const positionsRef = useRef<NodePositions>({ ...positions });
  // Embedded showcase only: true once the async ELK pass has applied final
  // positions, so we frame the graph after BOTH layout and node measurement.
  const [laidOut, setLaidOut] = useState(false);

  // Embedded (small fixed-height) showcase: once ELK has applied final positions
  // (laidOut) AND every node is measured (nodesInitialized) — culling is disabled
  // via onlyRenderVisibleElements={!embedded} so they all mount — animate the
  // viewport to frame the laid-out diagram. This is the same zoom-to-fit /try
  // plays on auto-layout, and the dynamic "it lays itself out" moment here.
  useEffect(() => {
    if (!embedded || !nodesInitialized || !laidOut || nodes.length === 0) return;
    fitView({ padding: 0.2, duration: 600 });
  }, [embedded, nodesInitialized, laidOut, nodes.length, fitView]);
  // Structural signature decides when to RE-LAYOUT; the full signature decides
  // when to refresh node/edge data (so attribute-only edits still reach the canvas).
  const signature = modelSignature(model);
  const dataSignature = useMemo(() => JSON.stringify(model), [model]);
  const lastStructRef = useRef<string>("");

  const commitPositions = (next: NodePositions) => {
    positionsRef.current = next;
    onPositionsChange?.(next);
  };

  const applyLayout = (laidNodes: Node<TableNodeData>[], laidEdges: Edge[]) => {
    const next: NodePositions = {};
    for (const n of laidNodes) next[n.id] = n.position;
    setNodes(laidNodes);
    setEdges(laidEdges);
    commitPositions(next);
    // Mark this structure as laid out only once we actually apply it — NOT
    // eagerly before the async ELK pass resolves. Setting it eagerly made
    // StrictMode's second effect invocation early-return (signature already
    // recorded) while the first invocation's async result was discarded as
    // cancelled, leaving a canvas that mounts with a model but never lays out.
    lastStructRef.current = signature;
    if (embedded) {
      // Framing is handled by the laidOut + measured effect (animated fitView).
      setLaidOut(true);
    } else {
      requestAnimationFrame(() => fitView({ duration: 250, padding: 0.2 }));
    }
  };

  // Embedded showcase entrance: pile the tables at the layout's centre, then
  // slide them out to their ELK positions over ~750ms. While moving, edges drop
  // their routed waypoints so RoutedEdge falls back to a live smooth-step path
  // that tracks the handles; at the end the orthogonal routing snaps back in.
  // fitBounds frames the destination up front so the whole thing plays in view.
  const animateEntrance = (
    laid: Node<TableNodeData>[],
    routed: Edge[],
    isCancelled: () => boolean,
  ) => {
    const heightOf = (n: Node<TableNodeData>) =>
      HEADER_HEIGHT + n.data.table.columns.length * ROW_HEIGHT;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const n of laid) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, n.position.y + heightOf(n));
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const startOf = (n: Node<TableNodeData>) => ({
      x: centerX - NODE_WIDTH / 2,
      y: centerY - heightOf(n) / 2,
    });

    // Record final positions now; render the pile with edges in live mode.
    const finalPositions: NodePositions = {};
    for (const n of laid) finalPositions[n.id] = n.position;
    commitPositions(finalPositions);
    lastStructRef.current = signature;
    setEdges(
      routed.map((e) => ({
        ...e,
        data: { ...(e.data as object), points: undefined },
      })),
    );
    setNodes(laid.map((n) => ({ ...n, position: startOf(n) })));
    fitBounds(
      { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      { padding: 0.2, duration: 0 },
    );

    const DURATION = 750;
    let startTs = 0;
    const step = (now: number) => {
      if (isCancelled()) return;
      if (!startTs) startTs = now;
      const t = Math.min(1, (now - startTs) / DURATION);
      const e = 1 - (1 - t) ** 3; // easeOutCubic
      setNodes(
        laid.map((n) => {
          const s = startOf(n);
          return {
            ...n,
            position: {
              x: s.x + (n.position.x - s.x) * e,
              y: s.y + (n.position.y - s.y) * e,
            },
          };
        }),
      );
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        // Settle: exact positions + the orthogonal routed edges.
        setNodes(laid);
        setEdges(routed);
        setLaidOut(true);
      }
    };
    requestAnimationFrame(step);
  };

  // Rebuild graph when the parsed model changes, preserving known positions.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on dataSignature
  useEffect(() => {
    // Attribute-only change (structure unchanged): refresh node data + edge
    // markers in place, preserving positions and routed waypoints. No relayout/fit.
    if (signature === lastStructRef.current) {
      const byKey = new Map(model.tables.map((t) => [t.key, t]));
      setNodes((ns) =>
        ns.map((n) => {
          const t = byKey.get(n.id);
          return t ? { ...n, data: { table: t } } : n;
        }),
      );
      const fresh = new Map(buildEdges(model).map((e) => [e.id, e]));
      setEdges((es) =>
        es.map((e) => {
          const f = fresh.get(e.id);
          if (!f) return e;
          return {
            ...e,
            markerStart: f.markerStart,
            markerEnd: f.markerEnd,
            data: { ...f.data, points: (e.data as { points?: unknown } | undefined)?.points },
          };
        }),
      );
      return;
    }

    let cancelled = false;
    const baseNodes = buildNodes(model, positionsRef.current);
    const baseEdges = buildEdges(model);
    const missing = baseNodes.filter((n) => !positionsRef.current[n.id]);

    // Nothing placed yet: run a full ELK auto-layout (async).
    if (baseNodes.length > 0 && missing.length === baseNodes.length) {
      layoutGraph(baseNodes, baseEdges)
        .then(({ nodes: laid, edges: routed }) => {
          if (cancelled) return;
          const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          if (embedded && !reduce) {
            animateEntrance(laid, routed, () => cancelled);
          } else {
            applyLayout(laid, routed);
          }
        })
        .catch(() => {
          if (cancelled) return;
          // Fallback: cascade so the blueprint is at least usable.
          const fb = baseNodes.map((n, i) => ({
            ...n,
            position: { x: 60 + i * 48, y: 60 + i * 48 },
          }));
          applyLayout(fb, baseEdges);
        });
      return () => {
        cancelled = true;
      };
    }

    // Some/all positions known: keep them, cascade-place any newcomers. Routed
    // points aren't recomputed here, so edges draw as smooth curves until the
    // next auto-layout.
    let finalNodes = baseNodes;
    if (missing.length > 0) {
      let i = 0;
      finalNodes = baseNodes.map((n) =>
        positionsRef.current[n.id]
          ? n
          : { ...n, position: { x: 60 + i * 48, y: 60 + i++ * 48 } },
      );
    }
    applyLayout(finalNodes, baseEdges);
    return () => {
      cancelled = true;
    };
  }, [dataSignature]);

  const persistFromNodes = (current: Node<TableNodeData>[]) => {
    const next: NodePositions = {};
    for (const n of current) next[n.id] = n.position;
    commitPositions(next);
  };

  const handleAutoLayout = async () => {
    setLayouting(true);
    try {
      const { nodes: laid, edges: routed } = await layoutGraph(nodes, edges);
      applyLayout(laid, routed);
    } finally {
      setLayouting(false);
    }
  };

  // Export the diagram fit-to-content as PNG/SVG (plan P1). Capture logic is
  // shared with the dashboard's offscreen exporter (./export-image).
  const handleExport = async (format: "png" | "svg") => {
    if (nodes.length === 0) return;
    try {
      await downloadFlowImage({
        root: document,
        nodes,
        format,
        filename: `blueprint.${format}`,
      });
    } catch {
      toast({
        variant: "error",
        title: "Export failed",
        description: "Couldn't generate the image. Please try again.",
      });
    }
  };

  useEffect(() => {
    if (!exportRequest) return;
    let cancelled = false;
    void handleExport(exportRequest.format).finally(() => {
      if (!cancelled) onExportRequestHandled?.();
    });
    return () => {
      cancelled = true;
    };
  }, [exportRequest?.id]);

  // A dragged table invalidates the routes touching it: drop their waypoints so
  // they fall back to live smooth curves until the next auto-layout.
  const onNodeDragStart: OnNodeDrag<Node<TableNodeData>> = (_, node) => {
    setEdges((eds) =>
      eds.map((e) =>
        (e.source === node.id || e.target === node.id) &&
        (e.data as { points?: unknown } | undefined)?.points
          ? { ...e, data: { ...e.data, points: undefined } }
          : e,
      ),
    );
  };

  const onNodeDragStop = () => persistFromNodes(nodes);
  const onNodeEnter: NodeMouseHandler = (_, node) => setHovered(node.id);
  const onEdgeEnter: EdgeMouseHandler = (_, edge) => setHovered(edge.id);
  const clearHover = () => setHovered(null);

  // Click-to-focus: pin the highlight on a table and zoom to its neighborhood.
  // Clicking it again (or the empty canvas) clears the focus (plan E6).
  const onNodeClick: NodeMouseHandler = (_, node) => {
    setPinned((p) => (p === node.id ? null : node.id));
    const ids = new Set<string>([node.id]);
    for (const e of getConnectedEdges([node], edges)) {
      ids.add(e.source);
      ids.add(e.target);
    }
    requestAnimationFrame(() =>
      fitView({ nodes: Array.from(ids, (id) => ({ id })), duration: 300, padding: 0.3 }),
    );
  };
  const onPaneClick = () => setPinned(null);

  // Hover takes precedence; otherwise the click-pinned focus stays active.
  const active = hovered ?? pinned;

  const { displayNodes, displayEdges } = useMemo(() => {
    if (!active) return { displayNodes: nodes, displayEdges: edges };

    const hiNodes = new Set<string>();
    const hiEdges = new Set<string>();
    const node = nodes.find((n) => n.id === active);
    if (node) {
      hiNodes.add(node.id);
      for (const e of getConnectedEdges([node], edges)) {
        hiEdges.add(e.id);
        hiNodes.add(e.source);
        hiNodes.add(e.target);
      }
    } else {
      const e = edges.find((x) => x.id === active);
      if (e) {
        hiEdges.add(e.id);
        hiNodes.add(e.source);
        hiNodes.add(e.target);
      }
    }

    return {
      displayNodes: nodes.map((n) => ({
        ...n,
        className: cn(n.className, hiNodes.has(n.id) ? "erd-hi" : "erd-dim"),
      })),
      displayEdges: edges.map((e) => {
        const on = hiEdges.has(e.id);
        return {
          ...e,
          className: on ? "erd-hi" : "erd-dim",
          animated: on,
          style: {
            ...e.style,
            stroke: on ? "var(--edge-highlight)" : "var(--edge)",
            strokeWidth: on ? 2 : 1.5,
          },
        };
      }),
    };
  }, [active, nodes, edges]);

  const exportMenu = hideExportControl ? null : (
    <DropdownMenu
      align="end"
      trigger={
        <Button size="sm" variant="outline">
          <DownloadIcon size={16} />
          <span className="hidden sm:inline">Export</span>
        </Button>
      }
    >
      <DropdownItem icon={ImageIcon} onClick={() => void handleExport("png")}>
        PNG image
      </DropdownItem>
      <DropdownItem icon={CodeIcon} onClick={() => void handleExport("svg")}>
        SVG vector
      </DropdownItem>
    </DropdownMenu>
  );
  const autoLayoutButton = !readOnly || allowAutoLayout ? (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAutoLayout}
      loading={layouting}
      disabled={layouting}
    >
      <LayoutIcon size={16} />
      <span className="hidden sm:inline">Auto layout</span>
    </Button>
  ) : null;

  return (
    <DensityContext.Provider value={density}>
    <ReactFlow
      nodes={displayNodes}
      edges={displayEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onNodeMouseEnter={onNodeEnter}
      onNodeMouseLeave={clearHover}
      onEdgeMouseEnter={onEdgeEnter}
      onEdgeMouseLeave={clearHover}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onlyRenderVisibleElements={!embedded}
      fitView
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={!readOnly}
      nodesConnectable={false}
      elementsSelectable={!readOnly}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--diagram-grid)" gap={22} size={1} />
      <Controls showInteractive={false} />
      {/* Auto-hide the minimap on tiny blueprints where it adds noise (E10). */}
      {model.tables.length >= 5 ? (
        <MiniMap
          pannable
          zoomable
          className="!border !border-border !bg-card"
          maskColor="color-mix(in srgb, var(--muted) 60%, transparent)"
          nodeColor="var(--primary)"
        />
      ) : null}
      {model.tables.length > 0 ? (
        <Panel position="top-right" className="flex items-center gap-2">
          <DensityControl value={density} onChange={changeDensity} />
          {autoLayoutFirst ? (
            <>
              {autoLayoutButton}
              {exportMenu}
            </>
          ) : (
            <>
              {exportMenu}
              {autoLayoutButton}
            </>
          )}
        </Panel>
      ) : null}
      {showLegend && model.relations.length > 0 ? (
        <Panel
          position={legendPlacement === "beside-controls" ? "bottom-left" : "top-left"}
          className={legendPlacement === "beside-controls" ? "!mb-4 !ml-14" : undefined}
        >
          <ErdLegend />
        </Panel>
      ) : null}
      {notice ? (
        // top-center, but offset down so it clears the top-left legend and the
        // top-right toolbar (which sit on the canvas's top edge) instead of
        // sharing their row.
        <Panel position="top-center" className="pointer-events-auto !mt-16 max-w-[calc(100%-1rem)]">
          {notice}
        </Panel>
      ) : null}
      {model.tables.length === 0 ? (
        // Fill the whole canvas and flex-center so the empty state sits in the
        // middle. React Flow's Panel position classes only center one axis at a
        // time, so we stretch it (!inset-0 !m-0) and center via flexbox. The
        // panel stays pointer-events-none so the empty canvas is still pannable;
        // only the CTA re-enables pointer events.
        <Panel
          position="top-left"
          className="pointer-events-none !inset-0 !m-0 flex items-center justify-center"
        >
          <div className="flex -translate-y-12 flex-col items-center gap-3 text-center text-muted-foreground">
            <DatabaseIcon size={28} className="pointer-events-none" />
            <p className="pointer-events-none text-sm">
              No tables yet — write some <code className="font-mono">CREATE TABLE</code>{" "}
              statements to see your blueprint.
            </p>
            {emptyAction ? <div className="pointer-events-auto">{emptyAction}</div> : null}
          </div>
        </Panel>
      ) : null}
    </ReactFlow>
    </DensityContext.Provider>
  );
}

/** Segmented control for the table-node detail level (Compact / Standard / Full). */
function DensityControl({
  value,
  onChange,
}: {
  value: Density;
  onChange: (d: Density) => void;
}) {
  return (
    <div
      className="flex items-center rounded-md border border-border bg-card p-0.5 shadow-sm"
      role="group"
      aria-label="Diagram detail level"
    >
      {DENSITY_ORDER.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-pressed={value === d}
          title={`${DENSITY_LABEL[d]} detail`}
          className={cn(
            "focus-ring rounded px-2 py-1 text-xs font-medium",
            value === d
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {DENSITY_LABEL[d]}
        </button>
      ))}
    </div>
  );
}

export function ErdCanvas({
  className,
  showSummary = true,
  ...props
}: ErdCanvasProps & { className?: string; showSummary?: boolean }) {
  return (
    <div className={cn("h-full w-full", className)}>
      {/* Crow's-foot cardinality marker defs (referenced by url(#…) on edges). */}
      <ErdMarkerDefs />
      <ReactFlowProvider>
        <Flow {...props} />
      </ReactFlowProvider>
      {/* Accessible text equivalent of the canvas (plan H7). Suppressed where the
          caller already server-renders its own copy (e.g. the public share page). */}
      {showSummary ? <SchemaSummary model={props.model} className="sr-only" /> : null}
    </div>
  );
}
