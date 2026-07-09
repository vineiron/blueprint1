"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EyeIcon } from "@/components/ui/icons";
import { cn, formatDate } from "@/lib/utils";
import type { VersionMeta } from "@/server/data/blueprints";

export function VersionTimeline({
  blueprintId,
  versions,
}: {
  blueprintId: string;
  versions: VersionMeta[];
}) {
  return (
    <ol className="relative space-y-3 border-l border-border/80 pl-4">
      {versions.map((v, index) => {
        const isCurrent = index === 0;
        return (
          <li key={v.id} className="relative">
            <span
              className={cn(
                "-left-[1.5rem] -translate-y-1/2 absolute top-1/2 h-4 w-4 rounded-full border-2 border-background",
                isCurrent ? "bg-primary" : "bg-border",
              )}
              aria-hidden
            />
            <div
              className={cn(
                "rounded-lg border bg-card p-4",
                isCurrent ? "border-primary/35 bg-primary/5" : "border-border",
              )}
            >
              {v.note ? (
                <p className="text-sm text-foreground">{v.note}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Saved version</p>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground">{formatDate(v.createdAt)}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {v.tableCount} table{v.tableCount === 1 ? "" : "s"}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {v.relationCount} relationship{v.relationCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {isCurrent ? <Badge variant="success">Current</Badge> : null}
                <div className="ml-auto flex items-center gap-2">
                  {!isCurrent ? (
                    <Link
                      href={`/blueprints/${blueprintId}/versions/${v.id}`}
                      className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
                    >
                      <EyeIcon size={15} />
                      View
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
