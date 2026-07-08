"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ExportImageRequest } from "@/components/blueprint-image-exporter";
import { BlueprintThumbnail } from "@/components/blueprint-thumbnail";
import { ShareDialog } from "@/components/share-dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownSub,
} from "@/components/ui/dropdown-menu";
import {
  CodeIcon,
  DownloadIcon,
  EyeIcon,
  GlobeIcon,
  HistoryIcon,
  ImageIcon,
  LockIcon,
  MoreVerticalIcon,
  ShareIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import type { ExportImageFormat } from "@/components/erd/export-image";
import { cn } from "@/lib/utils";
import type { BlueprintSummary } from "@/server/data/blueprints";
import {
  deleteBlueprintAction,
  getBlueprintGraphAction,
} from "@/server/actions/blueprints";

// React Flow is heavy and isn't otherwise on the dashboard — load the offscreen
// image exporter only when a user actually exports.
const BlueprintImageExporter = dynamic(
  () => import("@/components/blueprint-image-exporter").then((m) => m.BlueprintImageExporter),
  { ssr: false },
);

/** Filesystem-safe slug for the downloaded file name, derived from the title. */
function fileSlug(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "blueprint"
  );
}

export function BlueprintCard({
  blueprint: d,
  view,
}: {
  blueprint: BlueprintSummary;
  view: "grid" | "list";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportReq, setExportReq] = useState<ExportImageRequest | null>(null);
  // The "Preparing…" toast id, reused so the result toast replaces it in place
  // (instead of stacking a second toast on top).
  const exportToastRef = useRef<string | number | undefined>(undefined);

  async function handleExport(format: ExportImageFormat) {
    if (exporting) return;
    setExporting(true);
    exportToastRef.current = toast({ title: `Preparing ${format.toUpperCase()} export…` });
    const res = await getBlueprintGraphAction(d.id);
    if (!res.ok) {
      setExporting(false);
      toast({
        id: exportToastRef.current,
        variant: "error",
        title: "Couldn't export",
        description: res.error,
      });
      return;
    }
    // Mounting <BlueprintImageExporter> kicks off the offscreen render + capture;
    // it reports back via onDone (success or failure).
    setExportReq({
      model: res.data.graph,
      positions: res.data.positions,
      format,
      filename: `${fileSlug(res.data.title)}.${format}`,
    });
  }

  function handleExportDone(error?: string) {
    const req = exportReq;
    setExportReq(null);
    setExporting(false);
    if (error) {
      toast({
        id: exportToastRef.current,
        variant: "error",
        title: "Export failed",
        description: error,
      });
    } else {
      toast({
        id: exportToastRef.current,
        variant: "success",
        title: "Image exported",
        description: req?.filename,
      });
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteBlueprintAction(d.id);
    setDeleting(false);
    setConfirmOpen(false);
    if (res.ok) {
      toast({ variant: "success", title: "Blueprint deleted" });
      router.refresh();
    } else {
      toast({ variant: "error", title: "Couldn't delete", description: res.error });
    }
  }

  const badges = (
    <>
      {d.isPublic ? (
        <Badge variant="success">
          <GlobeIcon size={11} />
          Public
        </Badge>
      ) : (
        <Badge variant="secondary">
          <LockIcon size={11} />
          Private
        </Badge>
      )}
      {d.hasDraft ? <Badge variant="warning">Draft</Badge> : null}
    </>
  );

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card transition hover:border-primary/40 hover:shadow-md",
        view === "list" ? "flex items-center gap-4 p-4" : "p-3",
      )}
    >
      <Link
        href={`/blueprints/${d.id}`}
        aria-label={`Open ${d.title}`}
        className="focus-ring absolute inset-0 rounded-lg"
      />

      {view === "grid" ? (
        <BlueprintThumbnail
          thumb={d.thumbnail}
          className="mb-3 h-28 w-full overflow-hidden rounded-md border border-border"
        />
      ) : null}

      <div className={cn("min-w-0 flex-1", view === "grid" ? "pb-8" : "pr-6 pb-8")}>
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">{d.title}</h3>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>
            {d.tableCount} table{d.tableCount === 1 ? "" : "s"}
          </span>
          <span aria-hidden>·</span>
          <span>
            {d.versionCount} version{d.versionCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="absolute bottom-2 left-3 z-10 flex flex-wrap items-center gap-1.5 pr-12">
        {badges}
      </div>

      <div className="absolute right-2 bottom-2 z-10">
        <DropdownMenu
          trigger={
            <button
              type="button"
              aria-label="Blueprint actions"
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md bg-card/80 text-muted-foreground backdrop-blur hover:bg-muted"
            >
              <MoreVerticalIcon size={18} />
            </button>
          }
        >
          <DropdownItem icon={EyeIcon} onClick={() => router.push(`/blueprints/${d.id}`)}>
            Open
          </DropdownItem>
          <DropdownItem
            icon={HistoryIcon}
            onClick={() => router.push(`/blueprints/${d.id}/versions`)}
          >
            History
          </DropdownItem>
          <DropdownItem icon={ShareIcon} onClick={() => setShareOpen(true)}>
            Share
          </DropdownItem>
          <DropdownSub label={exporting ? "Exporting…" : "Export"} icon={DownloadIcon}>
            <DropdownItem
              icon={ImageIcon}
              disabled={exporting}
              onClick={() => void handleExport("png")}
            >
              PNG image
            </DropdownItem>
            <DropdownItem
              icon={CodeIcon}
              disabled={exporting}
              onClick={() => void handleExport("svg")}
            >
              SVG vector
            </DropdownItem>
          </DropdownSub>
          <DropdownSeparator />
          <DropdownItem icon={TrashIcon} destructive onClick={() => setConfirmOpen(true)}>
            Delete
          </DropdownItem>
        </DropdownMenu>
      </div>

      {exportReq ? (
        <BlueprintImageExporter request={exportReq} onDone={handleExportDone} />
      ) : null}

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        blueprintId={d.id}
        isPublic={d.isPublic}
        slug={d.publicSlug}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete "${d.title}"?`}
        description="This permanently deletes the blueprint and all of its versions. This can't be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
