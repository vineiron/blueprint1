import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";

/** Fixed export canvas size — the diagram is fit-to-content within this frame. */
const EXPORT_WIDTH = 1600;
const EXPORT_HEIGHT = 1000;

export type ExportImageFormat = "png" | "svg";

/**
 * Capture a rendered React Flow viewport fit-to-content and trigger a download.
 * Shared by the in-editor Export button (`erd-canvas`) and the dashboard's
 * offscreen exporter (`blueprint-image-exporter`).
 *
 * `root` scopes the DOM lookups (the `.react-flow__viewport` and the crow's-foot
 * marker `<defs>`) so this works correctly when a second, offscreen canvas is
 * mounted on a page that may also host the live editor canvas.
 *
 * Uses `html-to-image` (dynamic-imported so the chunk only loads on export).
 * Throws on failure — callers surface their own user-facing error.
 */
export async function downloadFlowImage(opts: {
  root: ParentNode;
  nodes: Node[];
  format: ExportImageFormat;
  filename: string;
}): Promise<void> {
  const { root, nodes, format, filename } = opts;
  const el = root.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!el || nodes.length === 0) throw new Error("Nothing to export.");

  const bounds = getNodesBounds(nodes);
  const { x, y, zoom } = getViewportForBounds(
    bounds,
    EXPORT_WIDTH,
    EXPORT_HEIGHT,
    0.2,
    2,
    0.15,
  );
  const backgroundColor = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const options = {
    backgroundColor,
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    style: {
      width: `${EXPORT_WIDTH}px`,
      height: `${EXPORT_HEIGHT}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
    },
  };

  // The crow's-foot marker <defs> live in a separate <svg> outside the captured
  // viewport, so url(#…) references won't resolve in the export. Clone them into
  // the captured node and bake context-stroke / CSS-var colors into concrete
  // values (exporters don't evaluate either). Removed again in `finally`.
  const rootStyle = getComputedStyle(document.documentElement);
  const edgeColor = rootStyle.getPropertyValue("--edge").trim() || "#94a3b8";
  const defs =
    (root.querySelector("#erd-marker-defs") as SVGSVGElement | null) ??
    (document.getElementById("erd-marker-defs") as SVGSVGElement | null);
  const clonedDefs = defs ? (defs.cloneNode(true) as SVGSVGElement) : null;
  if (clonedDefs) {
    clonedDefs.removeAttribute("id");
    for (const n of clonedDefs.querySelectorAll('[stroke="context-stroke"]')) {
      n.setAttribute("stroke", edgeColor);
    }
    for (const n of clonedDefs.querySelectorAll('[fill="var(--background)"]')) {
      n.setAttribute("fill", backgroundColor);
    }
    el.appendChild(clonedDefs);
  }

  try {
    const htmlToImage = await import("html-to-image");
    const dataUrl =
      format === "png"
        ? await htmlToImage.toPng(el, options)
        : await htmlToImage.toSvg(el, options);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  } finally {
    clonedDefs?.remove();
  }
}
