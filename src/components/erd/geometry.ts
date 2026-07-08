/**
 * Fixed table-box geometry, shared by the canvas (ELK port placement, table-node)
 * and the dashboard thumbnail. Kept dependency-free so importing it doesn't pull
 * React Flow into the dashboard bundle.
 */
export const NODE_WIDTH = 240; // w-60
export const HEADER_HEIGHT = 36; // h-9
export const ROW_HEIGHT = 32; // h-8

// The node has a 1px border on every side (box-sizing: border-box), which shifts
// the header/rows — and therefore each handle — down by 1px.
export const BORDER = 1;

/** Vertical center of a column's handle, measured from the node's top edge. */
export function portY(index: number): number {
  return BORDER + HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
}
