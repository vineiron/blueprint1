"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EyeIcon, RestoreIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";
import { restoreVersionAction } from "@/server/actions/blueprints";
import type { VersionMeta } from "@/server/data/blueprints";

export function VersionTimeline({
  blueprintId,
  versions,
  hasDraft = false,
}: {
  blueprintId: string;
  versions: VersionMeta[];
  hasDraft?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const restoreTarget = versions.find((v) => v.id === restoreId) ?? null;

  async function handleRestore() {
    if (!restoreId) return;
    setRestoring(true);
    const res = await restoreVersionAction(blueprintId, restoreId);
    setRestoring(false);
    setRestoreId(null);
    if (res.ok) {
      toast({
        variant: "success",
        title: "Restored version into the editor",
        description: "Review it, then Save as new version to keep it.",
      });
      router.push(`/blueprints/${blueprintId}?restored=1`);
      router.refresh();
    } else {
      toast({ variant: "error", title: "Couldn't restore", description: res.error });
    }
  }

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
                  <Link
                    href={`/blueprints/${blueprintId}/versions/${v.id}`}
                    className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
                  >
                    <EyeIcon size={15} />
                    View
                  </Link>
                  {!isCurrent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRestoreId(v.id)}
                    >
                      <RestoreIcon size={15} />
                      Restore
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}

      <ConfirmDialog
        open={restoreId !== null}
        onClose={() => setRestoreId(null)}
        onConfirm={handleRestore}
        loading={restoring}
        title={restoreTarget ? "Restore this version?" : "Restore version?"}
        description={
          hasDraft
            ? "This loads the snapshot into the editor as a draft and replaces your current unsaved draft changes. Your saved history is preserved; nothing is committed until you Save as new version."
            : "This loads the snapshot into the editor as a draft for review. Your saved history is preserved; nothing is committed until you Save as new version."
        }
        confirmLabel="Restore into editor"
        destructive={hasDraft}
      />
    </ol>
  );
}
