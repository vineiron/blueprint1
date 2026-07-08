import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "warning" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-accent text-accent-foreground",
  secondary: "bg-muted text-muted-foreground",
  success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  outline: "border border-border text-muted-foreground",
};

export interface BadgeProps extends ComponentProps<"span"> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
