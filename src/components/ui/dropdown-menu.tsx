"use client";

import { DropdownMenu as RMenu } from "radix-ui";
import type { ComponentProps, ComponentType, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, type IconProps } from "./icons";

/**
 * Dropdown menu on Radix (plan F7): roving-tabindex arrow-key navigation,
 * typeahead, ESC, outside-click, and focus return — for free. Public API
 * (trigger / align / DropdownItem / DropdownSeparator) preserved.
 */
export function DropdownMenu({
  trigger,
  children,
  align = "end",
}: {
  trigger: ReactElement;
  children: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <RMenu.Root>
      <RMenu.Trigger asChild>{trigger}</RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content
          align={align}
          sideOffset={4}
          className={cn(
            "z-50 min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg",
          )}
        >
          {children}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}

export function DropdownItem({
  className,
  destructive = false,
  icon: Icon,
  children,
  ...props
}: ComponentProps<"button"> & {
  destructive?: boolean;
  icon?: ComponentType<IconProps>;
}) {
  return (
    // Forward `disabled` to Radix too, so the item is skipped by roving-tabindex /
    // typeahead and gets aria-disabled — not just visually dimmed on the button.
    <RMenu.Item asChild disabled={props.disabled}>
      <button
        type="button"
        className={cn(
          "focus-ring flex w-full cursor-default items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm outline-none data-[highlighted]:bg-muted disabled:pointer-events-none disabled:opacity-50",
          destructive && "text-destructive data-[highlighted]:bg-destructive/10",
          className,
        )}
        {...props}
      >
        {Icon ? <Icon size={16} /> : null}
        {children}
      </button>
    </RMenu.Item>
  );
}

/**
 * Nested submenu (Radix Sub): a flyout that opens on hover/→ from a trigger row.
 * Trigger row mirrors DropdownItem's styling, with a trailing chevron affordance.
 */
export function DropdownSub({
  label,
  icon: Icon,
  children,
}: {
  label: ReactNode;
  icon?: ComponentType<IconProps>;
  children: ReactNode;
}) {
  return (
    <RMenu.Sub>
      <RMenu.SubTrigger asChild>
        <button
          type="button"
          className={cn(
            "focus-ring flex w-full cursor-default items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-sm outline-none data-[highlighted]:bg-muted data-[state=open]:bg-muted",
          )}
        >
          {Icon ? <Icon size={16} /> : null}
          <span className="flex-1">{label}</span>
          <ChevronRightIcon size={14} className="text-muted-foreground" />
        </button>
      </RMenu.SubTrigger>
      <RMenu.Portal>
        <RMenu.SubContent
          sideOffset={4}
          alignOffset={-4}
          className={cn(
            "z-50 min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg",
          )}
        >
          {children}
        </RMenu.SubContent>
      </RMenu.Portal>
    </RMenu.Sub>
  );
}

export function DropdownSeparator() {
  return <RMenu.Separator className="my-1 h-px bg-border" />;
}
