import { HEADER_HEIGHT, NODE_WIDTH, ROW_HEIGHT } from "@/components/erd/geometry";
import { DatabaseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { BlueprintThumb } from "@/server/data/blueprints";

const VB_W = 100;
const VB_H = 56;
const PAD = 6;

/**
 * Cheap, static SVG box-and-line sketch of a schema for dashboard cards.
 * Deliberately NOT React Flow (no canvas/ELK mounted per card). Pure markup.
 */
export function BlueprintThumbnail({
  thumb,
  className,
}: {
  thumb: BlueprintThumb | null;
  className?: string;
}) {
  const tables = thumb?.tables ?? [];
  if (tables.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-diagram-grid text-muted-foreground/40",
          className,
        )}
        aria-hidden="true"
      >
        <DatabaseIcon size={28} />
      </div>
    );
  }

  const boxes = tables.map((t) => ({
    key: t.key,
    x: t.x,
    y: t.y,
    w: NODE_WIDTH,
    h: HEADER_HEIGHT + Math.max(t.cols, 1) * ROW_HEIGHT,
  }));

  // No persisted positions (everything at origin) → deterministic grid fallback.
  if (boxes.every((b) => b.x === 0 && b.y === 0)) {
    const cols = Math.ceil(Math.sqrt(boxes.length));
    const GAP_X = NODE_WIDTH + 80;
    const GAP_Y = 260;
    boxes.forEach((b, i) => {
      b.x = (i % cols) * GAP_X;
      b.y = Math.floor(i / cols) * GAP_Y;
    });
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const worldW = Math.max(maxX - minX, 1);
  const worldH = Math.max(maxY - minY, 1);
  const scale = Math.min((VB_W - 2 * PAD) / worldW, (VB_H - 2 * PAD) / worldH);
  const offX = PAD + (VB_W - 2 * PAD - worldW * scale) / 2 - minX * scale;
  const offY = PAD + (VB_H - 2 * PAD - worldH * scale) / 2 - minY * scale;
  const sx = (x: number) => x * scale + offX;
  const sy = (y: number) => y * scale + offY;

  const centers = new Map(
    boxes.map((b) => [b.key, { cx: sx(b.x + b.w / 2), cy: sy(b.y + b.h / 2) }]),
  );

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("bg-diagram-grid", className)}
      aria-hidden="true"
    >
      {(thumb?.edges ?? []).map((e, i) => {
        const a = centers.get(e.from);
        const b = centers.get(e.to);
        if (!a || !b) return null;
        return (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: parallel edges share endpoints
            key={`e${i}`}
            x1={a.cx}
            y1={a.cy}
            x2={b.cx}
            y2={b.cy}
            stroke="var(--edge)"
            strokeWidth={0.5}
            opacity={0.6}
          />
        );
      })}
      {boxes.map((b) => {
        const x = sx(b.x);
        const y = sy(b.y);
        const w = b.w * scale;
        const h = b.h * scale;
        const headerH = Math.min(HEADER_HEIGHT * scale, h);
        return (
          <g key={b.key}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={1.2}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth={0.5}
            />
            <rect x={x} y={y} width={w} height={headerH} rx={1.2} fill="var(--primary)" opacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
}
