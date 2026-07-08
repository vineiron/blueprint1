/**
 * blueprint1 brand mark — "the connected node" mascot.
 *
 * A hero entity node (the face, with two simple eyes) wired to two satellite
 * nodes: a tiny living ERD graph. One fixed-color sky-blue version reads on
 * both light and dark backgrounds, so there's no theme variant to swap.
 *
 * The canonical asset lives at `docs/brand/blueprint1-mark.svg` and is mirrored
 * by `src/app/icon.svg` (favicon) — keep all three in sync if the art changes.
 */
import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/** The mascot glyph on its own. Decorative by default (aria-hidden). */
export function BrandMark({
  size = 28,
  ...props
}: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="bpBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="bpSat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      {/* relationship edges (behind the nodes) */}
      <g stroke="#0369a1" strokeWidth="8" strokeLinecap="round">
        <line x1="37" y1="46" x2="25" y2="28" />
        <line x1="59" y1="46" x2="71" y2="28" />
      </g>
      {/* satellite entity nodes */}
      <rect x="16" y="17" width="18" height="18" rx="6" fill="url(#bpSat)" />
      <rect x="62" y="17" width="18" height="18" rx="6" fill="url(#bpSat)" />
      <rect x="19.4" y="20" width="8" height="2.4" rx="1.2" fill="#bae6fd" opacity="0.6" />
      <rect x="65.4" y="20" width="8" height="2.4" rx="1.2" fill="#bae6fd" opacity="0.6" />
      {/* hero entity node (the face) */}
      <rect x="27" y="39" width="42" height="42" rx="14" fill="url(#bpBody)" />
      <rect x="34" y="45.5" width="17" height="3.2" rx="1.6" fill="#bae6fd" opacity="0.5" />
      {/* eyes (squircles that rhyme with the satellite nodes) */}
      <rect x="35.5" y="56.5" width="9.5" height="9.5" rx="3.2" fill="#ffffff" />
      <rect x="51" y="56.5" width="9.5" height="9.5" rx="3.2" fill="#ffffff" />
    </svg>
  );
}

/** Mark + "blueprint1" wordmark lockup. Inherits font-size from its parent. */
export function BrandLockup({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <BrandMark size={size} className="shrink-0" />
      <span>blueprint1</span>
    </span>
  );
}
