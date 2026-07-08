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
  hasDraft,
}: {
  open: boolean;
  onClose: () => void;
  blueprintId: string;
  blueprintTitle: string;
  versions: VersionMeta[];
  hasDraft: boolean;
}) {
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
        <VersionTimeline blueprintId={blueprintId} versions={versions} hasDraft={hasDraft} />
      )}
    </Sheet>
  );
}
