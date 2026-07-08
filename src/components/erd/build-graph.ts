import { type Edge, type Node } from "@xyflow/react";
import type { ErdModel, ErdRelation, NodePositions } from "@/lib/sql/types";
import { edgeMarkers } from "./erd-markers";
import { portY } from "./geometry";
import type { TableNodeData } from "./table-node";

export function buildNodes(
  model: ErdModel,
  positions: NodePositions,
): Node<TableNodeData>[] {
  return model.tables.map((table) => ({
    id: table.key,
    type: "table",
    position: positions[table.key] ?? { x: 0, y: 0 },
    data: { table },
  }));
}

/** Vertical offsets (from the node's top edge) of a self-referencing FK's two
 *  handles — source on the right, target on the left. ELK skips self-edges, so
 *  the edge component uses these to route a clean loop that clears the node's top
 *  instead of a curve hidden behind the card. Undefined for normal cross-table FKs. */
function selfRefOffsets(
  model: ErdModel,
  r: ErdRelation,
): { srcDy: number; tgtDy: number } | undefined {
  if (r.fromTable !== r.toTable) return undefined;
  const table = model.tables.find((t) => t.key === r.fromTable);
  if (!table) return undefined;
  const indexOf = (col: string) => {
    const i = table.columns.findIndex((c) => c.name === col);
    return i < 0 ? 0 : i;
  };
  return { srcDy: portY(indexOf(r.fromColumn)), tgtDy: portY(indexOf(r.toColumn)) };
}

export function buildEdges(model: ErdModel): Edge[] {
  return model.relations.map((r) => {
    // Crow's-foot: "many"/"one" + optional marker on the child, "one" bar on the parent.
    const { markerStart, markerEnd } = edgeMarkers(r.cardinality, r.optional);
    const selfRef = selfRefOffsets(model, r);
    return {
      id: r.id,
      source: r.fromTable,
      target: r.toTable,
      sourceHandle: `${r.fromTable}::${r.fromColumn}::source`,
      targetHandle: `${r.toTable}::${r.toColumn}::target`,
      type: "routed",
      markerStart,
      markerEnd,
      style: { stroke: "var(--edge)", strokeWidth: 1.5 },
      data: {
        cardinality: r.cardinality,
        name: r.name,
        columns: r.columns,
        optional: r.optional,
        ...(selfRef ? { selfRef } : {}),
      },
    };
  });
}
