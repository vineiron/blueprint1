import type { Cardinality } from "@/lib/sql/types";

/*
 * Crow's-foot (Information Engineering) cardinality markers.
 *
 * The PARENT (referenced/PK) end always shows a single bar ("one"). The CHILD
 * (FK) end shows: a crow's-foot for "many" or a bar for "one", preceded by an
 * open circle when participation is optional (nullable FK → "zero-or-..."), or a
 * bar when mandatory ("one-or-...").
 *
 * Markers use `context-stroke` so they inherit the edge's current color (incl.
 * the hover highlight). orient="auto-start-reverse" lets one marker serve both
 * the start (child) and end (parent) positions correctly.
 *
 * ⚠️ The exact refX / coordinate geometry is tuned by eye — give the rendered
 * markers a visual pass and nudge the numbers here if the spacing looks off.
 */

const MANY = {
  one: "erd-one",
  zeroOne: "erd-zero-one",
  oneMany: "erd-one-many",
  zeroMany: "erd-zero-many",
} as const;

export function edgeMarkers(
  cardinality: Cardinality,
  optional?: boolean,
): { markerStart: string; markerEnd: string } {
  const child =
    cardinality === "one-to-one"
      ? optional
        ? MANY.zeroOne
        : MANY.one
      : optional
        ? MANY.zeroMany
        : MANY.oneMany;
  // Return BARE marker ids — React Flow wraps them as url('#<id>') itself.
  // Passing a pre-wrapped url() string would get double-wrapped and resolve to nothing.
  return { markerStart: child, markerEnd: MANY.one };
}

const line = {
  stroke: "context-stroke",
  strokeWidth: 1.5,
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Hidden <defs> holding the marker shapes; mount once where edges render. */
export function ErdMarkerDefs() {
  return (
    <svg
      id="erd-marker-defs"
      width={0}
      height={0}
      aria-hidden="true"
      style={{ position: "absolute" }}
    >
      <title>ERD cardinality markers</title>
      <defs>
        {/* "one" — single bar */}
        <marker
          id="erd-one"
          markerWidth="22"
          markerHeight="20"
          refX="20"
          refY="10"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M12 4 L12 16" {...line} />
        </marker>

        {/* "zero or one" — open circle + bar */}
        <marker
          id="erd-zero-one"
          markerWidth="26"
          markerHeight="20"
          refX="24"
          refY="10"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <circle cx="6" cy="10" r="3.2" stroke="context-stroke" strokeWidth="1.5" fill="var(--background)" />
          <path d="M16 4 L16 16" {...line} />
        </marker>

        {/* "one or many" — bar + crow's-foot */}
        <marker
          id="erd-one-many"
          markerWidth="24"
          markerHeight="20"
          refX="22"
          refY="10"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M6 4 L6 16" {...line} />
          <path d="M9 10 L20 4 M9 10 L20 10 M9 10 L20 16" {...line} />
        </marker>

        {/* "zero or many" — open circle + crow's-foot */}
        <marker
          id="erd-zero-many"
          markerWidth="30"
          markerHeight="20"
          refX="28"
          refY="10"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <circle cx="6" cy="10" r="3.2" stroke="context-stroke" strokeWidth="1.5" fill="var(--background)" />
          <path d="M15 10 L26 4 M15 10 L26 10 M15 10 L26 16" {...line} />
        </marker>
      </defs>
    </svg>
  );
}

/** Compact legend decoding the glyphs (shown on canvases with relationships). */
export function ErdLegend() {
  return (
    <div className="pointer-events-none flex items-center gap-3 rounded-md border border-border bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
      <LegendItem glyph="bar" label="one" />
      <LegendItem glyph="crow" label="many" />
      <LegendItem glyph="circle" label="optional" />
    </div>
  );
}

function LegendItem({ glyph, label }: { glyph: "bar" | "crow" | "circle"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" className="text-foreground">
        <line x1="0" y1="7" x2="22" y2="7" stroke="var(--edge)" strokeWidth="1.5" />
        {glyph === "bar" ? (
          <path d="M14 3 L14 11" stroke="currentColor" strokeWidth="1.5" />
        ) : null}
        {glyph === "crow" ? (
          <path
            d="M9 7 L20 3 M9 7 L20 7 M9 7 L20 11"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        ) : null}
        {glyph === "circle" ? (
          <circle cx="11" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="var(--card)" />
        ) : null}
      </svg>
      {label}
    </span>
  );
}
