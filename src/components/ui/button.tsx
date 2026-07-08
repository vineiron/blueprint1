import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { SpinnerIcon } from "./icons";

const buttonVariants = cva(
  "focus-ring inline-flex select-none items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
        secondary: "bg-muted text-foreground hover:bg-accent",
        outline: "border border-border bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "bg-destructive-solid text-destructive-solid-foreground hover:bg-destructive-solid-hover shadow-sm",
      },
      size: {
        sm: "h-8 px-3 text-sm gap-1.5",
        md: "h-10 px-4 text-sm gap-2",
        lg: "h-11 px-6 text-base gap-2",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

// forwardRef so Radix `asChild` triggers (Dialog/DropdownMenu/Tooltip) can attach
// their ref to the underlying <button>.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <SpinnerIcon className="animate-spin" size={16} /> : null}
      {children}
    </button>
  );
});
