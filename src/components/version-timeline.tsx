"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EyeIcon, RestoreIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/utils";
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

  const currentNumber = versions.length > 0 ? versions[0].versionNumber : 0;
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
        title: `Restored v${res.data.versionNumber} into the editor`,
        description: "Review it, then Save as new version to keep it.",
      });
      router.push(`/blueprints/${blueprintId}?restored=${res.data.versionNumber}`);
      router.refresh();
    } else {
      toast({ variant: "error", title: "Couldn't restore", description: res.error });
    }
  }

  return (
    <ol className="relative space-y-3 border-l border-border pl-6">
      {versions.map((v) => {
        const isCurrent = v.versionNumber === currentNumber;
        return (
          <li key={v.id} className="relative">
            <span
              className="-left-[1.6rem] absolute top-3 h-2.5 w-2.5 rounded-full border-2 border-background"
              style={{ backgroundColor: isCurrent ? "var(--primary)" : "var(--border)" }}
            />
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">v{v.versionNumber}</span>
                {isCurrent ? <Badge variant="success">Current</Badge> : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatRelativeTime(v.createdAt)}
                </span>
              </div>
              {v.note ? (
                <p className="mt-1.5 text-sm text-foreground">{v.note}</p>
              ) : (
                <p className="mt-1.5 text-sm italic text-muted-foreground">No note</p>
              )}
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
          </li>
        );
      })}

      <ConfirmDialog
        open={restoreId !== null}
        onClose={() => setRestoreId(null)}
        onConfirm={handleRestore}
        loading={restoring}
        title={`Restore version ${restoreTarget?.versionNumber ?? ""}?`}
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
