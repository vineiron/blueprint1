"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { memo, useContext } from "react";
import { DatabaseIcon, KeyIcon, LinkIcon } from "@/components/ui/icons";
import type { ErdColumn, ErdTable } from "@/lib/sql/types";
import { cn } from "@/lib/utils";
import { DensityContext } from "./density";

export type TableNodeData = { table: ErdTable };
export type TableNodeType = Node<TableNodeData, "table">;

// Re-export the shared box geometry (defined dependency-free in ./geometry) so
// existing importers (layout.ts) keep working.
export { HEADER_HEIGHT, NODE_WIDTH, ROW_HEIGHT } from "./geometry";

const HANDLE_CLASS = "!h-2 !w-2 !min-h-0 !min-w-0 !border-0 !bg-transparent";

/** Full, explicit detail for the hover tooltip — communicates everything regardless of density. */
function columnDetail(col: ErdColumn): string {
  const lines: string[] = [`${col.name} ${col.type}`];
  if (col.pk) lines.push("PRIMARY KEY");
  if (col.fk && col.fkTarget) {
    lines.push(
      `FK → ${col.fkTarget.table}.${col.fkTarget.column}` +
        (col.fkTarget.onDelete ? ` (ON DELETE ${col.fkTarget.onDelete})` : ""),
    );
  }
  lines.push(col.nullable ? "NULL" : "NOT NULL");
  if (col.unique && !col.pk) lines.push("UNIQUE");
  if (col.default) lines.push(`DEFAULT ${col.default}`);
  if (col.check) lines.push(`CHECK (${col.check})`);
  if (col.enumValues?.length) lines.push(`ENUM: ${col.enumValues.join(", ")}`);
  if (col.comment) lines.push(`— ${col.comment}`);
  return lines.join("\n");
}

function Chip({ label, tone }: { label: string; tone?: "muted" | "warn" | "accent" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1 text-[9px] font-semibold uppercase leading-[14px] tracking-wide",
        tone === "warn"
          ? "bg-warning/15 text-warning"
          : tone === "accent"
            ? "bg-accent text-accent-foreground"
            : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function TableNodeComponent({ data }: NodeProps<TableNodeType>) {
  const { table } = data;
  const density = useContext(DensityContext);
  const showSchema = table.schema && table.schema !== "public";
  const indexCount = table.indexes?.length ?? 0;

  return (
    <div className="w-60 overflow-hidden rounded-lg border border-border bg-card shadow-md">
      <div
        className="flex h-9 items-center gap-2 px-3 font-semibold text-[13px]"
        style={{
          backgroundColor: "var(--node-header)",
          color: "var(--node-header-foreground)",
        }}
        title={table.comment ?? undefined}
      >
        <DatabaseIcon size={14} />
        <span className="truncate">
          {showSchema ? <span className="opacity-75">{table.schema}.</span> : null}
          {table.name}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {table.comment ? <span className="opacity-80" aria-hidden>ⓘ</span> : null}
          {density === "full" && indexCount > 0 ? (
            <span
              className="rounded bg-white/20 px-1 text-[10px] font-medium"
              title={(table.indexes ?? [])
                .map((i) => `${i.unique ? "UNIQUE " : ""}(${i.columns.join(", ")})`)
                .join("\n")}
            >
              {indexCount} idx
            </span>
          ) : null}
        </span>
      </div>

      {table.columns.length === 0 ? (
        <div className="px-3 py-2 text-xs italic text-muted-foreground">no columns</div>
      ) : (
        table.columns.map((col) => (
          <div
            key={col.name}
            className="relative flex h-8 items-center gap-2 border-t border-border px-3"
            title={columnDetail(col)}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${table.key}::${col.name}::target`}
              className={HANDLE_CLASS}
            />

            <span className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-[13px]">
              {col.pk ? (
                <KeyIcon size={12} className="shrink-0 text-pk" />
              ) : col.fk ? (
                <LinkIcon size={12} className="shrink-0 text-fk" />
              ) : (
                <span className="inline-block w-3 shrink-0" />
              )}
              <span className={cn("truncate", col.pk && "font-semibold")}>{col.name}</span>
              {/* Inline FK target only at full density. */}
              {density === "full" && col.fkTarget ? (
                <span className="shrink-0 truncate text-[11px] font-normal text-fk/80">
                  → {col.fkTarget.table}.{col.fkTarget.column}
                </span>
              ) : null}
            </span>

            {density !== "compact" ? (
              <span className="flex shrink-0 items-center gap-1">
                {/* Notable constraints as chips. Full density also makes NOT NULL explicit. */}
                {col.nullable ? (
                  <Chip label="null" tone="muted" />
                ) : density === "full" && !col.pk ? (
                  <Chip label="nn" tone="muted" />
                ) : null}
                {col.unique && !col.pk ? <Chip label="uq" tone="accent" /> : null}
                {col.enumValues?.length ? <Chip label="enum" tone="warn" /> : null}
                {density === "full" && col.default ? (
                  <span
                    className="max-w-[64px] truncate font-mono text-[10px] text-muted-foreground"
                    title={`DEFAULT ${col.default}`}
                  >
                    ={col.default}
                  </span>
                ) : null}
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {col.type}
                </span>
              </span>
            ) : null}

            <Handle
              type="source"
              position={Position.Right}
              id={`${table.key}::${col.name}::source`}
              className={HANDLE_CLASS}
            />
          </div>
        ))
      )}
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
