"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  HistoryIcon,
  ImageIcon,
  PencilIcon,
  SaveIcon,
  ShareIcon,
  SparklesIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { CopyButton } from "@/components/copy-button";
import type { ExportImageFormat } from "@/components/erd/export-image";
import { ShareDialog } from "@/components/share-dialog";
import { TemplateGallery } from "@/components/template-gallery";
import { useSignIn } from "@/components/sign-in-modal-provider";
import { VersionHistorySheet } from "@/components/version-history-sheet";
import { parseSql } from "@/lib/sql/parser";
import type { ErdModel, NodePositions } from "@/lib/sql/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { LIMITS, noteSchema, validateGraphSize } from "@/lib/validation";
import {
  createBlueprintAction,
  deleteBlueprintAction,
  discardDraftAction,
  saveAsNewVersionAction,
  saveDraftAction,
  updateMetaAction,
} from "@/server/actions/blueprints";
import type { VersionMeta } from "@/server/data/blueprints";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

// Heavy client-only chunks: load on the editor route with sized skeletons (H11).
const SqlEditor = dynamic(
  () => import("@/components/sql-editor").then((m) => m.SqlEditor),
  { ssr: false, loading: () => <PaneSkeleton label="Loading editor…" /> },
);
const ErdCanvas = dynamic(
  () => import("@/components/erd/erd-canvas").then((m) => m.ErdCanvas),
  { ssr: false, loading: () => <PaneSkeleton label="Loading canvas…" /> },
);

function PaneSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <SpinnerIcon size={16} className="animate-spin" />
      {label}
    </div>
  );
}

type SaveStatus = "idle" | "draft" | "unsaved" | "saving" | "saved" | "error";

// localStorage keys for the no-signup /try flow.
const TRY_KEY = "blueprint-try"; // { sql, positions } — autosaved playground state
const PENDING_KEY = "blueprint-pending"; // { sql, positions, title } — handed to /blueprints/new post-auth

interface CommonProps {
  initialTitle: string;
  initialSql: string;
  initialPositions: NodePositions;
}
type EditorWorkspaceProps = CommonProps &
  (
    | { mode: "create" }
    | { mode: "try" }
    | {
        mode: "edit";
        blueprintId: string;
        latestSql: string;
        latestPositions: NodePositions;
        isDraftInitial: boolean;
        draftUpdatedAt: string | null;
        isPublic: boolean;
        publicSlug: string | null;
        versions: VersionMeta[];
        restoredFrom?: number | null;
      }
  );

function serializePositions(positions: NodePositions): string {
  return Object.keys(positions)
    .sort()
    .map((k) => `${k}:${Math.round(positions[k].x)},${Math.round(positions[k].y)}`)
    .join("|");
}
const sigOf = (sql: string, positions: NodePositions) =>
  `${sql} ${serializePositions(positions)}`;

/** SSR-safe media query (client-only; the editor is dynamically imported). */
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

export function EditorWorkspace(props: EditorWorkspaceProps) {
  const router = useRouter();
  const { openSignIn } = useSignIn();
  const { toast } = useToast();

  const isEdit = props.mode === "edit";
  const isTry = props.mode === "try";
  const blueprintId = isEdit ? props.blueprintId : "";
  const latestSql = isEdit ? props.latestSql : "";
  const latestPositions = isEdit ? props.latestPositions : {};
  const isPublic = isEdit ? props.isPublic : false;
  const publicSlug = isEdit ? props.publicSlug : null;
  const restoredFrom = isEdit ? (props.restoredFrom ?? null) : null;
  const isDraftInitial = isEdit ? props.isDraftInitial : false;
  const draftUpdatedAt = isEdit ? props.draftUpdatedAt : null;

  const [title, setTitle] = useState(props.initialTitle);
  const [sql, setSql] = useState(props.initialSql);
  const [positions, setPositions] = useState<NodePositions>(props.initialPositions);
  const [model, setModel] = useState<ErdModel>(() => {
    const r = parseSql(props.initialSql);
    return r.ok ? r.model : { tables: [], relations: [] };
  });
  const [parseError, setParseError] = useState<{
    message: string;
    line?: number;
    column?: number;
  } | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>(isDraftInitial ? "draft" : "idle");
  const [canvasKey, setCanvasKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<"sql" | "erd">("sql");
  const [showRestored, setShowRestored] = useState(restoredFrom != null);
  // Resumed-draft notice: shown when the editor opens on a blueprint that has
  // uncommitted draft edits (the dashboard marks these "Draft"). Suppressed on
  // restore loads — the "Restored from v{n}" banner already covers that case.
  const [showDraftBanner, setShowDraftBanner] = useState(
    isDraftInitial && restoredFrom == null,
  );

  // Starter-schema insert state (create/try empty state). Remembers the
  // pre-insert snapshot and the exact inserted SQL so a curious click on an
  // example/template can be reverted back to a blank canvas. The revert banner
  // shows only while the inserted starter is still untouched (sql unchanged).
  const [starter, setStarter] = useState<{
    before: { sql: string; positions: NodePositions };
    insertedSql: string;
    label: string;
  } | null>(null);

  const [creating, setCreating] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportRequest, setExportRequest] = useState<{
    id: number;
    format: ExportImageFormat;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isDesktop = useIsDesktop();
  const isTablet = useIsTablet();
  // The resizable split reads localStorage (via useDefaultLayout), so it must
  // only render on the client — gate it behind a mount flag.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const noteForm = useForm<{ note: string }>({
    resolver: zodResolver(z.object({ note: noteSchema })),
    defaultValues: { note: "" },
  });

  const titleInputRef = useRef<HTMLInputElement>(null);

  const savedSigRef = useRef(sigOf(props.initialSql, props.initialPositions));
  const versionSig = isEdit ? sigOf(latestSql, latestPositions) : "";
  const currentSig = sigOf(sql, positions);

  // Latest content for blur/pagehide flush (avoids stale closures).
  const latestStateRef = useRef({ sql, positions });
  latestStateRef.current = { sql, positions };

  // Debounced parse for the live preview (~400ms idle, plan F5).
  useEffect(() => {
    const t = setTimeout(() => {
      const result = parseSql(sql);
      if (result.ok) {
        setModel(result.model);
        setParseError(null);
        setParseWarning(result.warning ?? null);
      } else {
        setParseError({ message: result.error, line: result.line, column: result.column });
        setParseWarning(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [sql]);

  // Debounced draft autosave (edit mode only, ~800ms idle).
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on content sig
  useEffect(() => {
    if (!isEdit) return;
    if (currentSig === savedSigRef.current) return;
    setStatus("unsaved");
    const t = setTimeout(async () => {
      setStatus("saving");
      const res = await saveDraftAction(blueprintId, { sql, positions });
      if (res.ok) {
        savedSigRef.current = currentSig;
        setStatus("saved");
      } else {
        setStatus("error");
        toast({ variant: "error", title: "Couldn't save draft", description: res.error });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [currentSig]);

  // Flush the draft immediately on tab hide / navigation / blur so the last edit
  // within the debounce window isn't lost (plan G2).
  const flushDraft = useCallback(() => {
    if (!isEdit) return;
    const { sql: s, positions: p } = latestStateRef.current;
    const sig = sigOf(s, p);
    if (sig === savedSigRef.current) return;
    savedSigRef.current = sig;
    void saveDraftAction(blueprintId, { sql: s, positions: p });
  }, [isEdit, blueprintId]);

  useEffect(() => {
    if (!isEdit) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };
    window.addEventListener("pagehide", flushDraft);
    window.addEventListener("blur", flushDraft);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      window.removeEventListener("blur", flushDraft);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isEdit, flushDraft]);

  // /try: restore the last playground session from localStorage on mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (!isTry) return;
    try {
      const raw = window.localStorage.getItem(TRY_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { sql?: string; positions?: NodePositions };
      if (typeof saved.sql === "string" && saved.sql.length > 0) {
        setSql(saved.sql);
        setPositions(saved.positions ?? {});
        const r = parseSql(saved.sql);
        setModel(r.ok ? r.model : { tables: [], relations: [] });
        setCanvasKey((k) => k + 1);
      }
    } catch {
      // ignore corrupt/blocked storage
    }
  }, []);

  // /try: autosave the playground to localStorage (no server, no account).
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on content sig
  useEffect(() => {
    if (!isTry) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(TRY_KEY, JSON.stringify({ sql, positions }));
      } catch {
        // ignore storage failures (private mode, quota)
      }
    }, 600);
    return () => clearTimeout(t);
  }, [currentSig]);

  // Create: pick up SQL stashed by /try's "Sign in to save" so the new editor
  // opens pre-filled after the OAuth round-trip. Consumed once, then cleared.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (props.mode !== "create") return;
    try {
      const raw = window.localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      window.localStorage.removeItem(PENDING_KEY);
      const saved = JSON.parse(raw) as {
        sql?: string;
        positions?: NodePositions;
        title?: string;
      };
      if (typeof saved.sql === "string" && saved.sql.trim().length > 0) {
        setSql(saved.sql);
        setPositions(saved.positions ?? {});
        if (saved.title) setTitle(saved.title);
        const r = parseSql(saved.sql);
        setModel(r.ok ? r.model : { tables: [], relations: [] });
        setCanvasKey((k) => k + 1);
        toast({
          variant: "success",
          title: "Loaded your playground schema",
          description: "Review it, then Create to save.",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Create: focus the (empty) name field on mount so the user can type a title
  // right away — a name is required before the blueprint can be created.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (props.mode !== "create") return;
    const el = titleInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  function handleSignInToSave() {
    try {
      window.localStorage.setItem(PENDING_KEY, JSON.stringify({ sql, positions, title }));
    } catch {
      // ignore storage failures; user can re-paste after sign-in
    }
    openSignIn("/blueprints/new");
  }

  // Load a starter schema (the example or a named template) into the empty
  // editor, remembering the pre-insert snapshot so it can be reverted.
  function insertStarter(nextSql: string, label: string) {
    setStarter({ before: { sql, positions }, insertedSql: nextSql, label });
    setSql(nextSql);
    const r = parseSql(nextSql);
    setModel(r.ok ? r.model : { tables: [], relations: [] });
    setCanvasKey((k) => k + 1);
  }

  // Revert a starter insert: restore the pre-insert snapshot (a blank canvas for
  // a fresh diagram) so the empty state — and the template picker — returns.
  function revertStarter() {
    if (!starter) return;
    const { before } = starter;
    setSql(before.sql);
    setPositions(before.positions);
    const r = parseSql(before.sql);
    setModel(r.ok ? r.model : { tables: [], relations: [] });
    setParseError(null);
    setParseWarning(null);
    setStarter(null);
    setCanvasKey((k) => k + 1);
  }

  const tableCount = model.tables.length;
  const relationCount = model.relations.length;
  const sizeError = useMemo(() => {
    const r = validateGraphSize(model);
    return r.ok ? null : r.error;
  }, [model]);
  const hasChangesSinceVersion = isEdit && currentSig !== versionSig;
  const canSaveVersion =
    tableCount > 0 && !sizeError && (props.mode === "create" || hasChangesSinceVersion);

  async function handleCreate() {
    if (tableCount === 0) {
      toast({
        variant: "error",
        title: "Nothing to save",
        description: "Add at least one CREATE TABLE statement.",
      });
      return;
    }
    if (title.trim().length === 0) {
      toast({
        variant: "error",
        title: "Name your blueprint",
        description: "Enter a name before creating.",
      });
      titleInputRef.current?.focus();
      return;
    }
    if (sizeError) {
      toast({ variant: "error", title: "Schema too large", description: sizeError });
      return;
    }
    setCreating(true);
    const res = await createBlueprintAction({ title, sql, positions });
    if (res && !res.ok) {
      setCreating(false);
      toast({ variant: "error", title: "Couldn't create", description: res.error });
    }
    // On success the action redirects; this component unmounts.
  }

  const submitVersion = noteForm.handleSubmit(async ({ note }) => {
    setSavingVersion(true);
    const res = await saveAsNewVersionAction(blueprintId, { sql, positions, note });
    setSavingVersion(false);
    if (res.ok) {
      savedSigRef.current = currentSig;
      setStatus("saved");
      setVersionDialogOpen(false);
      setShowRestored(false);
      setShowDraftBanner(false);
      noteForm.reset({ note: "" });
      toast({ variant: "success", title: `Saved version ${res.data.versionNumber}` });
      router.refresh();
    } else {
      toast({ variant: "error", title: "Couldn't save version", description: res.error });
    }
  });

  async function handleDiscard() {
    if (!isEdit) return;
    setDiscarding(true);
    const res = await discardDraftAction(blueprintId);
    setDiscarding(false);
    setDiscardOpen(false);
    if (res.ok) {
      setSql(latestSql);
      setPositions(latestPositions);
      const parsed = parseSql(latestSql);
      setModel(parsed.ok ? parsed.model : { tables: [], relations: [] });
      savedSigRef.current = sigOf(latestSql, latestPositions);
      setStatus("idle");
      setShowRestored(false);
      setShowDraftBanner(false);
      setCanvasKey((k) => k + 1);
      toast({ variant: "success", title: "Draft discarded" });
      router.refresh();
    } else {
      toast({ variant: "error", title: "Couldn't discard draft", description: res.error });
    }
  }

  async function handleTitleBlur() {
    if (!isEdit) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === props.initialTitle) return;
    const res = await updateMetaAction(blueprintId, { title: trimmed });
    if (!res.ok) {
      toast({ variant: "error", title: "Couldn't rename", description: res.error });
    } else {
      router.refresh();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteBlueprintAction(blueprintId);
    // On success the action redirects to /dashboard; this component unmounts.
    if (res && !res.ok) {
      setDeleting(false);
      setDeleteOpen(false);
      toast({ variant: "error", title: "Couldn't delete", description: res.error });
    }
  }

  function requestExport(format: ExportImageFormat) {
    setExportRequest((prev) => ({ id: (prev?.id ?? 0) + 1, format }));
  }

  const editorPane = (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1 p-2">
        {sql.trim().length > 0 ? (
          <CopyButton
            text={sql}
            label="Copy SQL"
            className="absolute right-4 top-4 z-10 shadow-sm"
          />
        ) : null}
        <SqlEditor
          value={sql}
          onChange={setSql}
          diagnostic={
            parseError
              ? { line: parseError.line, column: parseError.column, message: parseError.message }
              : null
          }
          placeholder="CREATE TABLE ..."
        />
      </div>
      <ParseStatus error={parseError} warning={parseWarning} sizeError={sizeError} />
    </div>
  );

  const canvasPane = (
    <ErdCanvas
      key={canvasKey}
      model={model}
      positions={positions}
      onPositionsChange={setPositions}
      hideExportControl={isEdit}
      exportRequest={exportRequest}
      onExportRequestHandled={() => setExportRequest(null)}
      showLegend={isDesktop}
      legendPlacement={isTablet ? "beside-controls" : "top-left"}
      emptyAction={
        !isEdit && sql.trim().length === 0 ? (
          <TemplateGallery onPick={(s, name) => insertStarter(s, `${name} template`)} />
        ) : undefined
      }
      notice={
        !isEdit && starter && sql === starter.insertedSql ? (
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-lg">
            <SparklesIcon size={13} className="shrink-0 text-primary" />
            <span className="truncate text-foreground">
              Previewing the <strong className="font-medium">{starter.label}</strong>
            </span>
            <button
              type="button"
              onClick={revertStarter}
              className="focus-ring shrink-0 rounded-full px-2 py-0.5 font-medium text-primary hover:bg-primary/10"
            >
              Start blank
            </button>
            <span className="h-3.5 w-px shrink-0 bg-border" aria-hidden />
            <button
              type="button"
              onClick={() => setStarter(null)}
              aria-label="Dismiss preview notice"
              className="focus-ring shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon size={13} />
            </button>
          </div>
        ) : undefined
      }
    />
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-3 py-1.5 sm:min-h-14 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(isTry ? "/" : "/dashboard")}
            aria-label="Back"
            className="shrink-0"
          >
            <ArrowLeftIcon size={18} />
          </Button>
          <div className="flex min-w-0 flex-col">
            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled blueprint"
              aria-label="Blueprint name"
              className="h-8 max-w-xs border-input bg-card text-base font-semibold"
            />
          </div>
          {isEdit ? <StatusChip status={status} /> : null}
          {isTry ? (
            <span className="hidden items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground sm:inline-flex">
              Playground
            </span>
          ) : null}
        </div>

        <div className="-mx-1 flex w-full items-center justify-between gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:ml-auto sm:w-auto sm:justify-start sm:overflow-visible sm:px-0 sm:pb-0">
          {isEdit ? (
            <>
              <Tooltip content="Delete blueprint">
                <button
                  type="button"
                  aria-label="Delete blueprint"
                  onClick={() => setDeleteOpen(true)}
                  className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-0 text-sm font-medium text-destructive transition-colors hover:border-destructive/60 hover:bg-destructive/20 lg:w-auto lg:px-3"
                >
                  <TrashIcon size={16} />
                  <span className="hidden lg:inline">Delete</span>
                </button>
              </Tooltip>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 shrink-0 px-0 lg:w-auto lg:px-3"
                onClick={() => setShareOpen(true)}
              >
                <ShareIcon size={16} />
                <span className="hidden lg:inline">Share</span>
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
            </>
          ) : null}
          {props.mode === "create" ? (
            <Button onClick={handleCreate} loading={creating} disabled={tableCount === 0}>
              {creating ? null : <SaveIcon size={16} />}
              Create Blueprint
            </Button>
          ) : isTry ? (
            <Button
              onClick={handleSignInToSave}
              disabled={tableCount === 0}
              aria-label="Sign in to save"
              title="Sign in to save"
              className="w-10 px-0 sm:w-auto sm:px-4"
            >
              <SaveIcon size={16} />
              <span className="hidden sm:inline">Sign in to save</span>
            </Button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                aria-label="Version history"
                className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-0 text-sm font-medium hover:bg-muted lg:w-auto lg:px-3"
              >
                <HistoryIcon size={16} />
                <span className="hidden lg:inline">History</span>
              </button>
              <Button
                onClick={() => setVersionDialogOpen(true)}
                disabled={!canSaveVersion}
                className="shrink-0"
              >
                <SaveIcon size={16} />
                <span className="hidden sm:inline">Save as new version</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Restored-from banner (plan G5) */}
      {showRestored && restoredFrom != null ? (
        <div className="flex items-center gap-2 border-b border-border bg-primary/10 px-4 py-2 text-sm text-foreground">
          <SparklesIcon size={15} className="text-primary" />
          <span>
            Restored from <strong>v{restoredFrom}</strong> as a draft. Review it, then
            “Save as new version” to keep it.
          </span>
          <button
            type="button"
            onClick={() => setShowRestored(false)}
            aria-label="Dismiss"
            className="focus-ring ml-auto rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <XIcon size={15} />
          </button>
        </div>
      ) : null}

      {/* Resumed-draft banner: the editor opened on a blueprint with uncommitted
          draft edits (shown as "Draft" on the dashboard). Mutually exclusive with
          the restored banner above (suppressed on restore loads). */}
      {showDraftBanner ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-warning/10 px-4 py-2 text-sm text-foreground">
          <PencilIcon size={15} className="shrink-0 text-warning" />
          <span>
            You're editing an <strong>unsaved draft</strong>
            {draftUpdatedAt ? <> · last edited {formatRelativeTime(draftUpdatedAt)}</> : null} — it
            hasn't been saved as a version yet.
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setVersionDialogOpen(true)}
              disabled={!canSaveVersion}
            >
              Save as version
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setDiscardOpen(true)}
              disabled={discarding}
            >
              Discard draft
            </Button>
          </div>
        </div>
      ) : null}

      {/* Workspace: resizable split on desktop, tabbed on mobile (F3/F4/F16).
          Before mount we render a static (non-resizable) split that's SSR-safe. */}
      {!mounted ? (
        <div className="flex min-h-0 flex-1 flex-row">
          <div className="min-w-0 basis-2/5">{editorPane}</div>
          <div className="w-1.5 shrink-0 bg-border" />
          <div className="relative min-w-0 flex-1">{canvasPane}</div>
        </div>
      ) : isDesktop ? (
        <EditorSplit editor={editorPane} canvas={canvasPane} />
      ) : (
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
      )}

      {/* Save-as-version dialog (react-hook-form + zod, plan A7) */}
      <Dialog
        open={versionDialogOpen}
        onClose={() => (savingVersion ? undefined : setVersionDialogOpen(false))}
        title="Save as new version"
        description="Commit the current blueprint as an immutable version in the history."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setVersionDialogOpen(false)}
              disabled={savingVersion}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitVersion()} loading={savingVersion}>
              Save version
            </Button>
          </>
        }
      >
        <label className="mb-1.5 block text-sm font-medium" htmlFor="version-note">
          Note <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="version-note"
          placeholder="What changed in this version?"
          rows={3}
          maxLength={LIMITS.noteMax}
          {...noteForm.register("note")}
        />
        {noteForm.formState.errors.note ? (
          <p className="mt-1 text-xs text-destructive">
            {noteForm.formState.errors.note.message}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {tableCount} table{tableCount === 1 ? "" : "s"} · {relationCount} relationship
          {relationCount === 1 ? "" : "s"}
        </p>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={handleDiscard}
        loading={discarding}
        title="Discard draft?"
        description="Your unsaved draft edits will be removed and the blueprint will return to the latest saved version. This can't be undone."
        confirmLabel="Discard draft"
        destructive
        hideFooterBorder
      />

      {isEdit ? (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          blueprintId={blueprintId}
          isPublic={isPublic}
          slug={publicSlug}
        />
      ) : null}

      {isEdit ? (
        <VersionHistorySheet
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          blueprintId={blueprintId}
          blueprintTitle={title || props.initialTitle}
          versions={props.versions}
          hasDraft={draftUpdatedAt != null}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete "${title}"?`}
        description="This permanently deletes the blueprint and all of its versions. This can't be undone."
        confirmLabel="Delete"
        destructive
        hideFooterBorder
      />
    </div>
  );
}

// Client-only resizable split — isolated so useDefaultLayout (which reads
// localStorage) never runs during SSR.
function EditorSplit({ editor, canvas }: { editor: ReactNode; canvas: ReactNode }) {
  const layout = useDefaultLayout({
    id: "blueprint-editor",
    storage: typeof window === "undefined" ? undefined : window.localStorage,
  });
  return (
    <Group
      orientation="horizontal"
      defaultLayout={layout.defaultLayout}
      onLayoutChanged={layout.onLayoutChanged}
      className="min-h-0 flex-1"
    >
      <Panel id="sql" defaultSize="40%" minSize="25%" className="min-w-0">
        {editor}
      </Panel>
      <Separator className="w-1.5 cursor-col-resize bg-border transition-colors hover:bg-primary/40" />
      <Panel id="erd" defaultSize="60%" minSize="30%" className="relative min-w-0">
        {canvas}
      </Panel>
    </Group>
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

function StatusChip({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { label: string; className: string; spin?: boolean }> = {
    idle: { label: "Up to date", className: "text-muted-foreground" },
    draft: { label: "Draft", className: "text-warning" },
    unsaved: { label: "Unsaved changes", className: "text-warning" },
    saving: { label: "Saving draft…", className: "text-muted-foreground", spin: true },
    saved: { label: "Draft saved", className: "text-success" },
    error: { label: "Save failed", className: "text-destructive" },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 text-xs font-medium sm:inline-flex",
        s.className,
      )}
    >
      {s.spin ? (
        <SpinnerIcon size={13} className="animate-spin" />
      ) : status === "saved" ? (
        <CheckIcon size={13} />
      ) : null}
      {s.label}
    </span>
  );
}

function ParseStatus({
  error,
  warning,
  sizeError,
}: {
  error: { message: string; line?: number; column?: number } | null;
  warning: string | null;
  sizeError: string | null;
}) {
  if (error) {
    const loc = error.line
      ? `Line ${error.line}${error.column ? `:${error.column}` : ""}: `
      : "";
    return (
      <div className="flex items-start gap-2 border-t border-border bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertIcon size={14} className="mt-0.5 shrink-0" />
        <span className="font-mono">
          {loc}
          {error.message}
        </span>
      </div>
    );
  }
  if (sizeError) {
    return (
      <div className="flex items-start gap-2 border-t border-border bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertIcon size={14} className="mt-0.5 shrink-0" />
        <span>{sizeError}</span>
      </div>
    );
  }
  if (warning) {
    return (
      <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-3 py-2 text-xs text-warning">
        <AlertIcon size={14} className="mt-0.5 shrink-0" />
        <span>{warning}</span>
      </div>
    );
  }
  return null;
}
