import "server-only";
import { and, count, desc, eq, inArray, max } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import {
  type Blueprint,
  type BlueprintVersion,
  blueprintVersions,
  blueprints,
} from "@/db/schema";
import type { ErdRelation, ErdTable, NodePositions } from "@/lib/sql/types";
import { generateSlug } from "@/lib/utils";

type Graph = { tables: ErdTable[]; relations: ErdRelation[] };

/** Minimal box-and-line sketch payload for dashboard thumbnails (no column detail). */
export interface ThumbTable {
  key: string;
  cols: number;
  x: number;
  y: number;
}
export interface BlueprintThumb {
  tables: ThumbTable[];
  edges: { from: string; to: string }[];
}

export interface BlueprintSummary {
  id: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
  hasDraft: boolean;
  versionCount: number;
  tableCount: number;
  latestVersionAt: Date | null;
  /** Latest version's table display-names, for dashboard search. */
  tableNames: string[];
  /** Mini graph for the card thumbnail (null when there's no version). */
  thumbnail: BlueprintThumb | null;
}

export interface VersionMeta {
  id: string;
  versionNumber: number;
  note: string | null;
  createdAt: Date;
  tableCount: number;
  relationCount: number;
}

/* -------------------------------------------------------------------- reads */

export async function getLatestVersion(blueprintId: string): Promise<BlueprintVersion | null> {
  const [row] = await db
    .select()
    .from(blueprintVersions)
    .where(eq(blueprintVersions.blueprintId, blueprintId))
    .orderBy(desc(blueprintVersions.versionNumber))
    .limit(1);
  return row ?? null;
}

export async function getOwnedBlueprint(
  id: string,
  userId: string,
): Promise<Blueprint | null> {
  const [row] = await db
    .select()
    .from(blueprints)
    .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
    .limit(1);
  return row ?? null;
}

function buildThumb(graph: Graph, positions: NodePositions): BlueprintThumb {
  return {
    // Cap at 40 — anything denser is illegible at thumbnail scale anyway.
    tables: graph.tables.slice(0, 40).map((t) => ({
      key: t.key,
      cols: t.columns.length,
      x: positions[t.key]?.x ?? 0,
      y: positions[t.key]?.y ?? 0,
    })),
    edges: graph.relations.map((r) => ({ from: r.fromTable, to: r.toTable })),
  };
}

/**
 * Dashboard list (owner-scoped). Constant query count regardless of N:
 * (1) the blueprints, (2) the latest version per blueprint via DISTINCT ON,
 * (3) per-blueprint version counts. The full graph stays server-side; only the
 * derived counts/names/thumbnail mini reach the client.
 */
export async function getBlueprintSummaries(userId: string): Promise<BlueprintSummary[]> {
  const rows = await db
    .select()
    .from(blueprints)
    .where(eq(blueprints.ownerId, userId))
    .orderBy(desc(blueprints.updatedAt));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const latestRows = await db
    .selectDistinctOn([blueprintVersions.blueprintId], {
      blueprintId: blueprintVersions.blueprintId,
      graph: blueprintVersions.graph,
      positions: blueprintVersions.positions,
      createdAt: blueprintVersions.createdAt,
    })
    .from(blueprintVersions)
    .where(inArray(blueprintVersions.blueprintId, ids))
    .orderBy(blueprintVersions.blueprintId, desc(blueprintVersions.versionNumber));
  const latestById = new Map(latestRows.map((v) => [v.blueprintId, v]));

  const countRows = await db
    .select({ blueprintId: blueprintVersions.blueprintId, cnt: count() })
    .from(blueprintVersions)
    .where(inArray(blueprintVersions.blueprintId, ids))
    .groupBy(blueprintVersions.blueprintId);
  const countById = new Map(countRows.map((c) => [c.blueprintId, c.cnt]));

  return rows.map((d): BlueprintSummary => {
    const latest = latestById.get(d.id);
    const graph = latest?.graph;
    return {
      id: d.id,
      title: d.title,
      isPublic: d.isPublic,
      publicSlug: d.publicSlug,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      hasDraft: d.draftUpdatedAt != null,
      versionCount: countById.get(d.id) ?? 0,
      tableCount: graph?.tables.length ?? 0,
      latestVersionAt: latest?.createdAt ?? null,
      tableNames: graph?.tables.map((t) => t.name) ?? [],
      thumbnail: graph ? buildThumb(graph, latest?.positions ?? {}) : null,
    };
  });
}

export async function getBlueprintForEditor(
  id: string,
  userId: string,
): Promise<{ blueprint: Blueprint; latestVersion: BlueprintVersion | null } | null> {
  const blueprint = await getOwnedBlueprint(id, userId);
  if (!blueprint) return null;
  const latestVersion = await getLatestVersion(id);
  return { blueprint, latestVersion };
}

export async function getBlueprintWithVersions(
  id: string,
  userId: string,
): Promise<{ blueprint: Blueprint; versions: VersionMeta[] } | null> {
  const blueprint = await getOwnedBlueprint(id, userId);
  if (!blueprint) return null;
  const rows = await db
    .select({
      id: blueprintVersions.id,
      versionNumber: blueprintVersions.versionNumber,
      note: blueprintVersions.note,
      createdAt: blueprintVersions.createdAt,
      graph: blueprintVersions.graph,
    })
    .from(blueprintVersions)
    .where(eq(blueprintVersions.blueprintId, id))
    .orderBy(desc(blueprintVersions.versionNumber));

  const versions: VersionMeta[] = rows.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    note: v.note,
    createdAt: v.createdAt,
    tableCount: v.graph.tables.length,
    relationCount: v.graph.relations.length,
  }));
  return { blueprint, versions };
}

export async function getOwnedVersion(
  blueprintId: string,
  versionId: string,
  userId: string,
): Promise<{ blueprint: Blueprint; version: BlueprintVersion } | null> {
  const blueprint = await getOwnedBlueprint(blueprintId, userId);
  if (!blueprint) return null;
  const [version] = await db
    .select()
    .from(blueprintVersions)
    .where(and(eq(blueprintVersions.id, versionId), eq(blueprintVersions.blueprintId, blueprintId)))
    .limit(1);
  return version ? { blueprint, version } : null;
}

export interface PublicBlueprint {
  id: string;
  title: string;
  sql: string;
  graph: Graph;
  positions: NodePositions;
  updatedAt: Date;
}

/**
 * Public read — no owner check; gated on is_public. Returns only viewer-safe
 * fields (no ownerId / draft). Wrapped in React cache() so the per-request triple
 * call (generateMetadata + page body + opengraph-image) hits the DB once.
 */
export const getPublicBlueprint = cache(
  async (slug: string): Promise<PublicBlueprint | null> => {
    const [row] = await db
      .select({
        id: blueprints.id,
        title: blueprints.title,
        updatedAt: blueprints.updatedAt,
      })
      .from(blueprints)
      .where(and(eq(blueprints.publicSlug, slug), eq(blueprints.isPublic, true)))
      .limit(1);
    if (!row) return null;

    const latest = await getLatestVersion(row.id);
    if (!latest) return null;

    return {
      id: row.id,
      title: row.title,
      sql: latest.sql,
      graph: latest.graph,
      positions: latest.positions ?? {},
      updatedAt: row.updatedAt,
    };
  },
);

/* ------------------------------------------------------------------ writes */

export async function createBlueprint(input: {
  ownerId: string;
  title: string;
  sql: string;
  graph: Graph;
  positions: NodePositions;
}): Promise<Blueprint> {
  return db.transaction(async (tx) => {
    const [blueprint] = await tx
      .insert(blueprints)
      .values({
        ownerId: input.ownerId,
        title: input.title,
      })
      .returning();
    await tx.insert(blueprintVersions).values({
      blueprintId: blueprint.id,
      versionNumber: 1,
      sql: input.sql,
      graph: input.graph,
      positions: input.positions,
      note: "Initial version",
    });
    return blueprint;
  });
}

/** Returns false when the caller doesn't own the blueprint. */
export async function updateDraft(
  id: string,
  userId: string,
  draft: { sql: string; positions: NodePositions },
): Promise<boolean> {
  const rows = await db
    .update(blueprints)
    .set({
      draftSql: draft.sql,
      draftPositions: draft.positions,
      draftUpdatedAt: new Date(),
    })
    .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
    .returning({ id: blueprints.id });
  return rows.length === 1;
}

export async function discardDraft(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .update(blueprints)
    .set({ draftSql: null, draftPositions: null, draftUpdatedAt: null })
    .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
    .returning({ id: blueprints.id });
  return rows.length === 1;
}

export async function saveAsNewVersion(
  id: string,
  userId: string,
  input: { sql: string; graph: Graph; positions: NodePositions; note: string | null },
): Promise<BlueprintVersion> {
  return db.transaction(async (tx) => {
    const [blueprint] = await tx
      .select({ id: blueprints.id })
      .from(blueprints)
      .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
      .limit(1);
    if (!blueprint) throw new Error("Blueprint not found or not authorized.");

    const [agg] = await tx
      .select({ latest: max(blueprintVersions.versionNumber) })
      .from(blueprintVersions)
      .where(eq(blueprintVersions.blueprintId, id));
    const nextNumber = (agg?.latest ?? 0) + 1;

    const [version] = await tx
      .insert(blueprintVersions)
      .values({
        blueprintId: id,
        versionNumber: nextNumber,
        sql: input.sql,
        graph: input.graph,
        positions: input.positions,
        note: input.note,
      })
      .returning();

    await tx
      .update(blueprints)
      .set({
        draftSql: null,
        draftPositions: null,
        draftUpdatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(blueprints.id, id));

    return version;
  });
}

/**
 * Restore copy-forward THROUGH the draft (non-destructive): copy the selected
 * version's sql+positions into the blueprint's draft slot so the editor opens
 * with it for review. Nothing is committed until the user "Saves as new version",
 * so history stays immutable. Returns the source version number (for the banner).
 */
export async function restoreVersionToDraft(
  id: string,
  userId: string,
  versionId: string,
): Promise<{ versionNumber: number }> {
  return db.transaction(async (tx) => {
    const [blueprint] = await tx
      .select({ id: blueprints.id })
      .from(blueprints)
      .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
      .limit(1);
    if (!blueprint) throw new Error("Blueprint not found or not authorized.");

    const [source] = await tx
      .select()
      .from(blueprintVersions)
      .where(and(eq(blueprintVersions.id, versionId), eq(blueprintVersions.blueprintId, id)))
      .limit(1);
    if (!source) throw new Error("Version not found.");

    await tx
      .update(blueprints)
      .set({
        draftSql: source.sql,
        draftPositions: source.positions,
        draftUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blueprints.id, id));

    return { versionNumber: source.versionNumber };
  });
}

export async function setVisibility(
  id: string,
  userId: string,
  isPublic: boolean,
): Promise<{ isPublic: boolean; publicSlug: string | null } | null> {
  const blueprint = await getOwnedBlueprint(id, userId);
  if (!blueprint) return null;

  let slug = blueprint.publicSlug;
  if (isPublic) {
    // Mint a slug on first publish (or after a previous un-publish dropped it).
    if (!slug) {
      // Generate a unique slug (retry on the rare collision).
      for (let i = 0; i < 6; i++) {
        const candidate = generateSlug(12);
        const [existing] = await db
          .select({ id: blueprints.id })
          .from(blueprints)
          .where(eq(blueprints.publicSlug, candidate))
          .limit(1);
        if (!existing) {
          slug = candidate;
          break;
        }
      }
    }
  } else {
    // Un-publish ROTATES (drops) the slug so existing /share links die for good;
    // re-publishing later mints a brand-new link rather than reviving the old one.
    slug = null;
  }

  const rows = await db
    .update(blueprints)
    .set({ isPublic, publicSlug: slug })
    .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
    .returning({ isPublic: blueprints.isPublic, publicSlug: blueprints.publicSlug });
  return rows[0] ?? null;
}

export async function updateBlueprintMeta(
  id: string,
  userId: string,
  patch: { title?: string },
): Promise<boolean> {
  const rows = await db
    .update(blueprints)
    .set(patch)
    .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
    .returning({ id: blueprints.id });
  return rows.length === 1;
}

export async function deleteBlueprint(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .delete(blueprints)
    .where(and(eq(blueprints.id, id), eq(blueprints.ownerId, userId)))
    .returning({ id: blueprints.id });
  return rows.length === 1;
}
