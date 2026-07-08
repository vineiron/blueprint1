import { createContext } from "react";

/**
 * How much per-column detail the table nodes render (plan P0 density control).
 * - compact:  key icon + name only (densest, best for big-schema overview)
 * - standard: + type + chips for the *notable* constraints (UNIQUE, NULLABLE)
 * - full:     + explicit NOT NULL, inline FK target, default, enum values
 * Hover (title) always exposes the complete detail regardless of level.
 */
export type Density = "compact" | "standard" | "full";

export const DENSITY_ORDER: Density[] = ["compact", "standard", "full"];
export const DENSITY_LABEL: Record<Density, string> = {
  compact: "Compact",
  standard: "Standard",
  full: "Full",
};

export const DensityContext = createContext<Density>("standard");
