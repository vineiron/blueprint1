import { cn } from "@/lib/utils";
import { type IconProps, SpinnerIcon } from "./icons";

export function Spinner({ className, ...props }: IconProps) {
  return (
    <SpinnerIcon
      className={cn("animate-spin text-muted-foreground", className)}
      {...props}
    />
  );
}
