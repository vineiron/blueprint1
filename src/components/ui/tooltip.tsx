"use client";

import { Tooltip as RTooltip } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip on Radix (plan F7): keyboard-focus + pointer triggers, portal'd,
 * collision-aware. Public API (content / side / className) preserved. The child
 * must be a single element (Radix `asChild`).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <RTooltip.Provider delayDuration={300}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 max-w-xs rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md",
              className,
            )}
          >
            {content}
            <RTooltip.Arrow className="fill-foreground" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
