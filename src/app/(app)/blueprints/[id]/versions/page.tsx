import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeftIcon, HistoryIcon } from "@/components/ui/icons";
import { VersionTimeline } from "@/components/version-timeline";
import { requireAuthUserId } from "@/server/auth";
import { getBlueprintWithVersions } from "@/server/data/blueprints";

export const metadata = { title: "Version history" };

export default async function VersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireAuthUserId(`/blueprints/${id}/versions`);
  const result = await getBlueprintWithVersions(id, userId);
  if (!result) notFound();

  const { blueprint, versions } = result;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/blueprints/${id}`}
          aria-label="Back to blueprint"
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ArrowLeftIcon size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Version history</h1>
          <p className="text-sm text-muted-foreground">{blueprint.title}</p>
        </div>
      </div>

      {versions.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No versions yet" />
      ) : (
        <VersionTimeline
          blueprintId={id}
          versions={versions}
          hasDraft={blueprint.draftUpdatedAt != null}
        />
      )}
    </div>
  );
}
