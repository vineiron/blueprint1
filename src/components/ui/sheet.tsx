"use client";

import { Dialog as RDialog, VisuallyHidden } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "./icons";

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
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
        <RDialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
        <RDialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-lg border-border border-t bg-card text-card-foreground shadow-xl outline-none md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:max-h-none md:w-[380px] md:rounded-none md:border-l md:border-t-0 lg:w-[420px]",
            className,
          )}
        >
          <div className="flex flex-col border-border border-b">
            <div className="flex justify-center pt-2 md:hidden">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                {title ? (
                  <RDialog.Title className="text-lg font-semibold">{title}</RDialog.Title>
                ) : (
                  <VisuallyHidden.Root>
                    <RDialog.Title>Sheet</RDialog.Title>
                  </VisuallyHidden.Root>
                )}
                {description ? (
                  <RDialog.Description className="mt-1 truncate text-sm text-muted-foreground">
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
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
