import { ImageResponse } from "next/og";
import { getPublicBlueprint } from "@/server/data/blueprints";

export const alt = "blueprint1 — entity-relationship blueprint";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens (kept literal — Satori can't read CSS vars).
const BG = "#0b1220";
const PANEL = "#0f172a";
const BORDER = "#1e293b";
const SKY = "#38bdf8";
const SLATE = "#94a3b8";
const FG = "#f8fafc";

/**
 * Dynamic OpenGraph/Twitter card for a public blueprint (plan P1) — so links
 * unfurl as a branded ERD teaser instead of plain text. Rendered with next/og
 * (Satori: flexbox subset only). Falls back to a generic card if not found.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blueprint = await getPublicBlueprint(slug);

  const title = blueprint
    ? blueprint.title.length > 70
      ? `${blueprint.title.slice(0, 69)}…`
      : blueprint.title
    : "Blueprint";
  const tables = blueprint?.graph.tables ?? [];
  const relationCount = blueprint?.graph.relations.length ?? 0;
  const chips = tables.slice(0, 6).map((t) => t.name);
  const extra = tables.length - chips.length;

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        color: FG,
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      {/* Brand row */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#0284c7",
          }}
        />
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: SKY }}>
          blueprint1
        </div>
        <div style={{ display: "flex", marginLeft: "auto", fontSize: 26, color: SLATE }}>
          PostgreSQL → ERD
        </div>
      </div>

      {/* Title + chips + stats */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: FG, lineHeight: 1.1 }}>
          {title}
        </div>

        {chips.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
            {chips.map((name) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: `2px solid ${BORDER}`,
                  background: PANEL,
                  color: "#e2e8f0",
                  borderRadius: 10,
                  padding: "8px 16px",
                  fontSize: 26,
                  fontFamily: "monospace",
                }}
              >
                {name}
              </div>
            ))}
            {extra > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: SLATE,
                  fontSize: 26,
                  padding: "8px 4px",
                }}
              >
                +{extra} more
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: SLATE }}>
          {tables.length} tables · {relationCount} relationships
        </div>
      </div>
    </div>,
    size,
  );
}
