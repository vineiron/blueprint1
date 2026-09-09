import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "blueprint1: paste PostgreSQL DDL, see an interactive entity-relationship diagram, share it with anyone.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens, kept literal: Satori cannot read CSS variables.
const FG = "#0f172a";
const MUTED = "#64748b";
const SKY = "#0284c7";
const BORDER = "#e2e8f0";

// Literal paths on purpose: a computed path makes Next trace the whole
// project into this route's bundle.
async function markDataUri() {
  const file = await readFile(join(process.cwd(), "src/app/icon.svg"));
  return `data:image/svg+xml;base64,${file.toString("base64")}`;
}

async function editorDataUri() {
  const file = await readFile(
    join(process.cwd(), "public/og/editor-light.png"),
  );
  return `data:image/png;base64,${file.toString("base64")}`;
}

/**
 * Static social card for the landing and other non-share routes. Share pages
 * keep their own generated card in `share/[slug]/opengraph-image.tsx`.
 * Rendered once at build time; no request-time APIs are used.
 */
export default async function Image() {
  const [mark, editor] = await Promise.all([markDataUri(), editorDataUri()]);

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        // Sky tint fading to the page background. Satori handles linear
        // gradients with solid stops; radial gradients render wrong.
        background: "linear-gradient(135deg, #e0f2fe 0%, #f8fafc 45%)",
        color: FG,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 60,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: satori renders plain img */}
        <img src={mark} alt="" width={52} height={52} />
        <span
          style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.3px" }}
        >
          blueprint1
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          right: 80,
          top: 70,
          fontSize: 22,
          fontWeight: 500,
          color: SKY,
        }}
      >
        blueprint1-theta.vercel.app
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 138,
          display: "flex",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-1.3px",
          lineHeight: 1.08,
        }}
      >
        <span>Simply&nbsp;</span>
        <span style={{ color: SKY }}>visualize</span>
        <span>&nbsp;your SQL schema.</span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 226,
          fontSize: 25,
          lineHeight: 1.4,
          color: MUTED,
        }}
      >
        Paste your SQL. See the diagram. Share it with anyone.
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 306,
          display: "flex",
          width: 1040,
          height: 451,
          overflow: "hidden",
          borderRadius: "14px 14px 0 0",
          border: `1px solid ${BORDER}`,
          boxShadow:
            "0 8px 20px rgba(15, 23, 42, 0.08), 0 24px 56px rgba(15, 23, 42, 0.14)",
          background: "#ffffff",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: satori renders plain img */}
        <img src={editor} alt="" width={1040} height={451} />
      </div>
    </div>,
    size,
  );
}
