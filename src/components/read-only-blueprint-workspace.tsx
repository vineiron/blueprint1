"use client";

import { useEffect, useState } from "react";
import { BlueprintViewer } from "@/components/blueprint-viewer";
import { CopyButton } from "@/components/copy-button";
import type { ExportImageFormat } from "@/components/erd/export-image";
import { SqlEditor } from "@/components/sql-editor";
import type { ErdModel, NodePositions } from "@/lib/sql/types";
import { cn } from "@/lib/utils";

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function useIsTablet(): boolean {
  const [tablet, setTablet] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const update = () => setTablet(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return tablet;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function ReadOnlyBlueprintWorkspace({
  sql,
  model,
  positions,
  showCopyButton = true,
  summary = true,
  exportRequest,
  onExportRequestHandled,
}: {
  sql: string;
  model: ErdModel;
  positions: NodePositions;
  showCopyButton?: boolean;
  summary?: boolean;
  exportRequest?: { id: number; format: ExportImageFormat } | null;
  onExportRequestHandled?: () => void;
}) {
  const isDesktop = useIsDesktop();
  const isTablet = useIsTablet();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"sql" | "erd">("sql");

  const editorPane = (
    <div className="relative h-full p-2">
      {showCopyButton ? (
        <CopyButton
          text={sql}
          label="Copy SQL"
          className="absolute right-4 top-4 z-10 shadow-sm"
        />
      ) : null}
      <SqlEditor value={sql} readOnly />
    </div>
  );

  const canvasPane = (
    <div className="relative h-full">
      <BlueprintViewer
        model={model}
        positions={positions}
        summary={summary}
        showLegend={!isMobile}
        legendPlacement={isTablet ? "beside-controls" : "top-left"}
        showExportControl={false}
        allowAutoLayout
        exportRequest={exportRequest}
        onExportRequestHandled={onExportRequestHandled}
      />
    </div>
  );

  if (isDesktop) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-[40%_0.375rem_minmax(0,1fr)]">
        <div className="min-h-0 min-w-0">{editorPane}</div>
        <div className="bg-border" aria-hidden />
        <div className="relative min-h-0 min-w-0">{canvasPane}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b border-border bg-card">
        <TabButton active={mobileTab === "sql"} onClick={() => setMobileTab("sql")}>
          SQL
        </TabButton>
        <TabButton active={mobileTab === "erd"} onClick={() => setMobileTab("erd")}>
          Blueprint
        </TabButton>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className={cn("h-full", mobileTab === "sql" ? "block" : "hidden")}>
          {editorPane}
        </div>
        <div className={cn("h-full", mobileTab === "erd" ? "block" : "hidden")}>
          {canvasPane}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring flex-1 border-b-2 px-3 py-2 text-sm font-medium",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
