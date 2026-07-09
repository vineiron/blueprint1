import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShareView } from "@/components/public-share-view";
import { SchemaSummary } from "@/components/schema-summary";
import { getPublicBlueprint } from "@/server/data/blueprints";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blueprint = await getPublicBlueprint(slug);
  if (!blueprint) return { title: "Blueprint not found" };
  const { tables, relations } = blueprint.graph;
  return {
    title: blueprint.title,
    description: `Entity-relationship blueprint — ${tables.length} tables, ${relations.length} relationships.`,
    openGraph: { title: blueprint.title, type: "website" },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blueprint = await getPublicBlueprint(slug);
  if (!blueprint) notFound();

  return (
    <>
      <PublicShareView
        title={blueprint.title}
        sql={blueprint.sql}
        model={blueprint.graph}
        positions={blueprint.positions}
        updatedAt={blueprint.updatedAt.toISOString()}
      />
      <SchemaSummary model={blueprint.graph} className="sr-only" />
    </>
  );
}
