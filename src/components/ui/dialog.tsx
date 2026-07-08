"use client";

import { Dialog as RDialog, VisuallyHidden } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "./icons";

/**
 * Modal dialog on Radix (plan F6/F7): focus-trap + focus-restore + ESC +
 * scroll-lock + aria-modal for free. Public prop API unchanged from the prior
 * hand-rolled version so all call sites work as-is.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  hideFooterBorder = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Drop the separator line above the footer buttons. */
  hideFooterBorder?: boolean;
  className?: string;
}) {
  return (
    <RDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <RDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card text-card-foreground shadow-xl outline-none",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 p-5 pb-2">
            <div className="min-w-0">
              {title ? (
                <RDialog.Title className="text-lg font-semibold">{title}</RDialog.Title>
              ) : (
                <VisuallyHidden.Root>
                  <RDialog.Title>Dialog</RDialog.Title>
                </VisuallyHidden.Root>
              )}
              {description ? (
                <RDialog.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </RDialog.Description>
              ) : null}
            </div>
            <RDialog.Close
              aria-label="Close"
              className="focus-ring -mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <XIcon size={18} />
            </RDialog.Close>
          </div>
          <div className="p-5 pt-2">{children}</div>
          {footer ? (
            <div
              className={cn(
                "flex justify-end gap-2",
                hideFooterBorder ? "px-5 pb-5 pt-1" : "border-t border-border p-4",
              )}
            >
              {footer}
            </div>
          ) : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
