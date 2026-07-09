"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExportImageFormat } from "@/components/erd/export-image";
import { ReadOnlyBlueprintWorkspace } from "@/components/read-only-blueprint-workspace";
import { BrandLockup } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  EyeIcon,
  ImageIcon,
  KeyIcon,
  LinkIcon,
  ShareIcon,
  SparklesIcon,
} from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import type { ErdModel, NodePositions } from "@/lib/sql/types";
import { formatRelativeTime } from "@/lib/utils";

export function PublicShareView({
  title,
  sql,
  model,
  positions,
  updatedAt,
}: {
  title: string;
  sql: string;
  model: ErdModel;
  positions: NodePositions;
  updatedAt: string;
}) {
  const { toast } = useToast();
  const [shareCopied, setShareCopied] = useState(false);
  const [exportRequest, setExportRequest] = useState<{
    id: number;
    format: ExportImageFormat;
  } | null>(null);

  const tableCount = model.tables.length;
  const relationCount = model.relations.length;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      toast({ variant: "error", title: "Couldn't copy link" });
    }
  }

  function requestExport(format: ExportImageFormat) {
    setExportRequest((prev) => ({ id: (prev?.id ?? 0) + 1, format }));
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            aria-label="blueprint1 home"
            className="focus-ring shrink-0 rounded-md p-1 hover:bg-muted"
          >
            <BrandLockup />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/try"
              className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-0 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover sm:w-auto sm:px-3"
              aria-label="Make your own blueprint"
            >
              <SparklesIcon size={16} />
              <span className="hidden md:inline">Make your own blueprint</span>
              <span className="hidden sm:inline md:hidden">Make your own</span>
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:min-h-10 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {tableCount} table{tableCount === 1 ? "" : "s"} · {relationCount}{" "}
              relationship{relationCount === 1 ? "" : "s"} · Updated{" "}
              {formatRelativeTime(updatedAt)}
            </p>
          </div>

          <div className="-mx-1 flex w-full items-center justify-end gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:ml-auto sm:w-auto sm:justify-start sm:overflow-visible sm:px-0 sm:pb-0">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 px-0 lg:w-auto lg:px-3"
              onClick={copyShareLink}
              aria-label="Share link"
            >
              {shareCopied ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
              <span className="hidden lg:inline">{shareCopied ? "Copied" : "Share"}</span>
            </Button>
            <DropdownMenu
              align="end"
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 shrink-0 px-0 lg:w-auto lg:px-3"
                  disabled={tableCount === 0}
                >
                  <DownloadIcon size={16} />
                  <span className="hidden lg:inline">Export</span>
                </Button>
              }
            >
              <DropdownItem icon={ImageIcon} onClick={() => requestExport("png")}>
                PNG image
              </DropdownItem>
              <DropdownItem icon={CodeIcon} onClick={() => requestExport("svg")}>
                SVG vector
              </DropdownItem>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Public share view</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <EyeIcon size={12} />
          Read-only
        </span>
        <ShareLegend />
      </div>

      <ReadOnlyBlueprintWorkspace
        sql={sql}
        model={model}
        positions={positions}
        summary={false}
        exportRequest={exportRequest}
        onExportRequestHandled={() => setExportRequest(null)}
      />
    </div>
  );
}

/** Compact legend decoding the node glyphs/badges for non-expert viewers. */
function ShareLegend() {
  return (
    <span className="ml-auto hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex">
      <span className="inline-flex items-center gap-1">
        <KeyIcon size={12} className="text-pk" /> primary key
      </span>
      <span className="inline-flex items-center gap-1">
        <LinkIcon size={12} className="text-fk" /> foreign key
      </span>
      <span>
        <LegendChip>NN</LegendChip> not null
      </span>
      <span>
        <LegendChip>UQ</LegendChip> unique
      </span>
      <span>
        <LegendChip>ENUM</LegendChip> enum
      </span>
    </span>
  );
}

function LegendChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1 text-[9px] font-semibold uppercase text-muted-foreground">
      {children}
    </span>
  );
}
