"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** Small client island: copies `text` to the clipboard with brief feedback. */
export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (insecure context) — no-op
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs font-medium hover:bg-muted",
        className,
      )}
    >
      {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
