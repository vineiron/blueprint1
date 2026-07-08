import type { Edge, Node } from "@xyflow/react";
import type ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkNode, ElkPort } from "elkjs/lib/elk.bundled.js";
import { BORDER, portY } from "./geometry";
import { HEADER_HEIGHT, NODE_WIDTH, ROW_HEIGHT, type TableNodeData } from "./table-node";

export type EdgePoint = { x: number; y: number };

// elkjs ships a worker-backed bundle that touches browser globals. Import it
// lazily (dynamic import, browser-only) so this module stays safe to evaluate
// during SSR of the client canvas; the type import above is erased at build.
let elkInstance: ELK | null = null;
async function getElk(): Promise<ELK> {
  if (!elkInstance) {
    const mod = await import("elkjs/lib/elk.bundled.js");
    elkInstance = new mod.default();
  }
  return elkInstance;
}

// Layered (Sugiyama) layout with network-simplex placement keeps related tables
// close, and orthogonal routing threads edges through the gaps between tables.
const LAYOUT_OPTIONS: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.spacing.nodeNodeBetweenLayers": "90",
  "elk.spacing.nodeNode": "44",
  "elk.spacing.edgeNode": "24",
  "elk.spacing.edgeEdge": "14",
  "elk.layered.spacing.edgeNodeBetweenLayers": "24",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "14",
  // Keep the FK-less / polymorphic tables (no edges) packed instead of scattered.
  "elk.separateConnectedComponents": "true",
  "elk.spacing.componentComponent": "60",
};

function nodeHeight(columnCount: number): number {
  return 2 * BORDER + HEADER_HEIGHT + Math.max(columnCount, 1) * ROW_HEIGHT;
}

// Handle ids are "table::column::source|target" — pull the column name out.
function handleColumn(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const parts = handle.split("::");
  return parts.length >= 2 ? parts[1] : null;
}

function columnIndex(node: Node<TableNodeData>, col: string | null): number {
  if (!col) return 0;
  const i = node.data.table.columns.findIndex((c) => c.name === col);
  return i < 0 ? 0 : i;
}

/**
 * Position table nodes and route their relationships with ELK.
 *
 * Returns new node objects (with `position`) and new edge objects whose
 * `data.points` holds the orthogonal waypoints ELK routed around the tables.
 * Edges that can't be routed (self-references, missing endpoints) come back
 * with `data.points` cleared; the edge component then draws the dedicated
 * self-loop (from `data.selfRef`) or a smooth fallback curve.
 */
export async function layoutGraph(
  nodes: Node<TableNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<TableNodeData>[]; edges: Edge[] }> {
  if (nodes.length === 0) return { nodes, edges };

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build the ports each edge needs: a column-precise anchor on the correct
  // side (source = EAST, target = WEST, matching the rendered handles).
  const portsByNode = new Map<string, Map<string, ElkPort>>();
  const ensurePort = (nodeId: string, portId: string, side: "WEST" | "EAST", y: number) => {
    let ports = portsByNode.get(nodeId);
    if (!ports) {
      ports = new Map();
      portsByNode.set(nodeId, ports);
    }
    if (!ports.has(portId)) {
      ports.set(portId, {
        id: portId,
        x: side === "WEST" ? 0 : NODE_WIDTH,
        y,
        width: 1,
        height: 1,
        layoutOptions: { "elk.port.side": side },
      });
    }
  };

  const elkEdges: ElkExtendedEdge[] = [];
  for (const e of edges) {
    if (e.source === e.target) continue; // self-reference: render as fallback curve
    const srcNode = nodeById.get(e.source);
    const tgtNode = nodeById.get(e.target);
    if (!srcNode || !tgtNode) continue;

    const srcPortId = e.sourceHandle ?? `${e.source}::__source`;
    const tgtPortId = e.targetHandle ?? `${e.target}::__target`;
    ensurePort(e.source, srcPortId, "EAST", portY(columnIndex(srcNode, handleColumn(e.sourceHandle))));
    ensurePort(e.target, tgtPortId, "WEST", portY(columnIndex(tgtNode, handleColumn(e.targetHandle))));
    elkEdges.push({ id: e.id, sources: [srcPortId], targets: [tgtPortId] });
  }

  const children: ElkNode[] = nodes.map((n) => {
    const ports = Array.from(portsByNode.get(n.id)?.values() ?? []);
    return {
      id: n.id,
      width: NODE_WIDTH,
      height: nodeHeight(n.data.table.columns.length),
      ports,
      ...(ports.length > 0 ? { layoutOptions: { "elk.portConstraints": "FIXED_POS" } } : {}),
    };
  });

  const elk = await getElk();
  const result = await elk.layout({
    id: "root",
    layoutOptions: LAYOUT_OPTIONS,
    children,
    edges: elkEdges,
  });

  const positionById = new Map<string, EdgePoint>();
  for (const c of result.children ?? []) {
    positionById.set(c.id, { x: c.x ?? 0, y: c.y ?? 0 });
  }

  const pointsById = new Map<string, EdgePoint[]>();
  for (const ee of result.edges ?? []) {
    const section = ee.sections?.[0];
    if (!section) continue;
    pointsById.set(ee.id, [
      section.startPoint,
      ...(section.bendPoints ?? []),
      section.endPoint,
    ]);
  }

  const laidNodes = nodes.map((n) => {
    const p = positionById.get(n.id);
    return p ? { ...n, position: { x: p.x, y: p.y } } : n;
  });

  const laidEdges = edges.map((e) => ({
    ...e,
    data: { ...e.data, points: pointsById.get(e.id) },
  }));

  return { nodes: laidNodes, edges: laidEdges };
}
