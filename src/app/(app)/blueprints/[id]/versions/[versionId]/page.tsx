import Link from "next/link";
import { notFound } from "next/navigation";
import { BlueprintViewer } from "@/components/blueprint-viewer";
import { RestoreVersionButton } from "@/components/restore-version-button";
import { SqlEditor } from "@/components/sql-editor";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { requireAuthUserId } from "@/server/auth";
import { getLatestVersion, getOwnedVersion } from "@/server/data/blueprints";

export const metadata = { title: "Version" };

export default async function VersionViewPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const { id, versionId } = await params;
  const userId = await requireAuthUserId(`/blueprints/${id}/versions/${versionId}`);
  const result = await getOwnedVersion(id, versionId, userId);
  if (!result) notFound();

  const { blueprint, version } = result;
  const latest = await getLatestVersion(id);
  const isCurrent = latest?.id === version.id;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link
          href={`/blueprints/${id}?history=1`}
          aria-label="Back to history"
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ArrowLeftIcon size={18} />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{blueprint.title}</h1>
            {isCurrent ? <Badge variant="success">Current</Badge> : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {version.note ?? "No note"}
          </p>
        </div>
      </div>

      {!isCurrent ? (
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border bg-warning/10 px-4 py-2 text-sm text-warning sm:justify-between">
          <span className="text-center sm:text-left">
            You&apos;re viewing an older version (read-only).
          </span>
          <RestoreVersionButton
            blueprintId={id}
            versionId={version.id}
            hasDraft={blueprint.draftUpdatedAt != null}
          />
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-[40%_0.375rem_minmax(0,1fr)] md:grid-cols-[40%_0.375rem_minmax(0,1fr)] md:grid-rows-1">
        <div className="min-h-0 min-w-0 p-2">
          <SqlEditor value={version.sql} readOnly />
        </div>
        <div className="bg-border" aria-hidden />
        <div className="relative min-h-0 flex-1">
          <BlueprintViewer model={version.graph} positions={version.positions ?? {}} />
        </div>
      </div>
    </div>
  );
}
