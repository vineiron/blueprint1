import { notFound } from "next/navigation";
import { EditorWorkspace } from "@/components/editor-workspace";
import { requireAuthUserId } from "@/server/auth";
import { getBlueprintForEditor } from "@/server/data/blueprints";

export default async function BlueprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ restored?: string; history?: string }>;
}) {
  const { id } = await params;
  const { restored, history } = await searchParams;
  const userId = await requireAuthUserId(`/blueprints/${id}`);
  const result = await getBlueprintForEditor(id, userId);
  if (!result) notFound();

  const { blueprint, latestVersion, versions } = result;
  const latestSql = latestVersion?.sql ?? "";
  const latestPositions = latestVersion?.positions ?? {};
  const hasDraft = blueprint.draftSql != null;
  const wasRestored = restored != null;

  return (
    <div className="h-full">
      <EditorWorkspace
        mode="edit"
        blueprintId={id}
        initialTitle={blueprint.title}
        initialSql={hasDraft ? (blueprint.draftSql ?? "") : latestSql}
        initialPositions={hasDraft ? (blueprint.draftPositions ?? {}) : latestPositions}
        latestSql={latestSql}
        latestPositions={latestPositions}
        isDraftInitial={hasDraft}
        draftUpdatedAt={blueprint.draftUpdatedAt ? blueprint.draftUpdatedAt.toISOString() : null}
        isPublic={blueprint.isPublic}
        publicSlug={blueprint.publicSlug}
        versions={versions}
        wasRestored={wasRestored}
        initialHistoryOpen={history != null}
      />
    </div>
  );
}
