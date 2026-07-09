"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { HistoryIcon } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { VersionTimeline } from "@/components/version-timeline";
import type { VersionMeta } from "@/server/data/blueprints";

export function VersionHistorySheet({
  open,
  onClose,
  blueprintId,
  blueprintTitle,
  versions,
}: {
  open: boolean;
  onClose: () => void;
  blueprintId: string;
  blueprintTitle: string;
  versions: VersionMeta[];
}) {
  const hasOlderVersions = versions.length > 1;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Version history"
      description={blueprintTitle}
    >
      {versions.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No versions yet"
          className="min-h-64 border-dashed bg-background/40"
        />
      ) : (
        <div className="space-y-3">
          {hasOlderVersions ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Open an older version to review it. You can load it as a draft from the version view.
            </p>
          ) : null}
          <VersionTimeline blueprintId={blueprintId} versions={versions} />
        </div>
      )}
    </Sheet>
  );
}
