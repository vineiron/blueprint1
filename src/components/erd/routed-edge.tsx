import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { memo } from "react";

type Point = { x: number; y: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Build an SVG path through ELK's waypoints, rounding each corner so the
// orthogonal route reads as a clean elbow rather than a hard right angle.
function roundedPath(points: Point[], radius = 10): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const r1 = Math.min(radius, distance(prev, corner) / 2);
    const r2 = Math.min(radius, distance(corner, next) / 2);

    const inLen = distance(prev, corner) || 1;
    const outLen = distance(corner, next) || 1;
    const enter = {
      x: corner.x - ((corner.x - prev.x) / inLen) * r1,
      y: corner.y - ((corner.y - prev.y) / inLen) * r1,
    };
    const exit = {
      x: corner.x + ((next.x - corner.x) / outLen) * r2,
      y: corner.y + ((next.y - corner.y) / outLen) * r2,
    };

    d += ` L ${enter.x},${enter.y} Q ${corner.x},${corner.y} ${exit.x},${exit.y}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x},${last.y}`;
  return d;
}

/**
 * Edge that follows the orthogonal waypoints produced by the ELK auto-layout
 * (stored in `data.points`). When no route is available — before the first
 * auto-layout, or while a table is being dragged — it falls back to a standard
 * smooth-step curve so the edge still tracks the handles live.
 */
function RoutedEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerStart,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const edgeData = data as
    | { points?: Point[]; selfRef?: { srcDy: number; tgtDy: number } }
    | undefined;
  const points = edgeData?.points;

  let path: string;
  if (points && points.length >= 2) {
    path = roundedPath(points);
  } else if (source === target) {
    // Self-reference (e.g. parent_id → id): ELK skips self-edges. Route a clean
    // orthogonal loop that exits the source (right edge), rises clear above the
    // node's top, and drops into the target (left edge). `selfRef` carries each
    // handle's offset from the node top, so `nodeTop` (and thus the run height)
    // is exact regardless of which rows the FK touches. Without it, an arc whose
    // body sat inside the card would be hidden behind the (opaque) node — only
    // the marker stubs would leak out the sides.
    const selfRef = edgeData?.selfRef;
    if (selfRef) {
      const out = 26; // risers sit this far outside the node's left/right edges
      const clear = 22; // horizontal run sits this far above the node's top edge
      const nodeTop = Math.min(sourceY - selfRef.srcDy, targetY - selfRef.tgtDy);
      const topY = nodeTop - clear;
      path = roundedPath([
        { x: sourceX, y: sourceY },
        { x: sourceX + out, y: sourceY },
        { x: sourceX + out, y: topY },
        { x: targetX - out, y: topY },
        { x: targetX - out, y: targetY },
        { x: targetX, y: targetY },
      ]);
    } else {
      // No geometry available (e.g. a graph persisted before `selfRef`): fall back
      // to a smooth arc over the node.
      const out = 30;
      const apexY = Math.min(sourceY, targetY) - 64;
      path = `M ${sourceX},${sourceY} C ${sourceX + out},${apexY} ${targetX - out},${apexY} ${targetX},${targetY}`;
    }
  } else {
    [path] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 8,
    });
  }

  return (
    <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} style={style} />
  );
}

// Memoized so unrelated state changes (hover on other edges) don't re-render
// every edge (plan E9).
export const RoutedEdge = memo(RoutedEdgeComponent);
