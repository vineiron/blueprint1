"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, err, ok } from "@/lib/action-result";
import { parseSql } from "@/lib/sql/parser";
import type { ErdModel, NodePositions } from "@/lib/sql/types";
import {
  validateDdl,
  validateGraphSize,
  validateNote,
  validateTitle,
} from "@/lib/validation";
import { requireUserId } from "@/server/auth";
import * as data from "@/server/data/blueprints";

async function getUserId(): Promise<string | null> {
  try {
    return await requireUserId();
  } catch {
    return null;
  }
}

function safePositions(input: unknown): NodePositions {
  if (!input || typeof input !== "object") return {};
  const out: NodePositions = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const v = value as { x?: unknown; y?: unknown };
    if (typeof v?.x === "number" && typeof v?.y === "number") {
      out[key] = { x: v.x, y: v.y };
    }
  }
  return out;
}

export async function createBlueprintAction(input: {
  title: string;
  sql: string;
  positions?: NodePositions;
}): Promise<ActionResult<null>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");

  const title = validateTitle(input.title);
  if (!title.ok) return err(title.error);
  const ddl = validateDdl(input.sql);
  if (!ddl.ok) return err(ddl.error);

  const parsed = parseSql(ddl.value);
  if (!parsed.ok) return err(`Couldn't parse SQL: ${parsed.error}`);
  if (parsed.model.tables.length === 0)
    return err("Add at least one CREATE TABLE statement before saving.");
  const size = validateGraphSize(parsed.model);
  if (!size.ok) return err(size.error);

  let blueprintId: string;
  try {
    const blueprint = await data.createBlueprint({
      ownerId: userId,
      title: title.value,
      sql: ddl.value,
      graph: { tables: parsed.model.tables, relations: parsed.model.relations },
      positions: safePositions(input.positions),
    });
    blueprintId = blueprint.id;
  } catch {
    return err("Couldn't create the blueprint. Please try again.");
  }

  revalidatePath("/dashboard");
  redirect(`/blueprints/${blueprintId}`);
}

export async function saveDraftAction(
  id: string,
  input: { sql: string; positions?: NodePositions },
): Promise<ActionResult<null>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");
  const ddl = validateDdl(input.sql);
  if (!ddl.ok) return err(ddl.error);

  try {
    const saved = await data.updateDraft(id, userId, {
      sql: ddl.value,
      positions: safePositions(input.positions),
    });
    if (!saved) return err("Blueprint not found or not authorized.");
  } catch {
    return err("Couldn't save the draft.");
  }
  return ok(null);
}

export async function saveAsNewVersionAction(
  id: string,
  input: { sql: string; positions?: NodePositions; note: string },
): Promise<ActionResult<null>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");

  const ddl = validateDdl(input.sql);
  if (!ddl.ok) return err(ddl.error);
  const note = validateNote(input.note);
  if (!note.ok) return err(note.error);

  const parsed = parseSql(ddl.value);
  if (!parsed.ok) return err(`Couldn't parse SQL: ${parsed.error}`);
  if (parsed.model.tables.length === 0)
    return err("Add at least one CREATE TABLE statement before saving a version.");
  const size = validateGraphSize(parsed.model);
  if (!size.ok) return err(size.error);

  try {
    await data.saveAsNewVersion(id, userId, {
      sql: ddl.value,
      graph: { tables: parsed.model.tables, relations: parsed.model.relations },
      positions: safePositions(input.positions),
      note: note.value,
    });
    revalidatePath(`/blueprints/${id}`);
    revalidatePath(`/blueprints/${id}/versions`);
    revalidatePath("/dashboard");
    return ok(null);
  } catch {
    return err("Couldn't save the version.");
  }
}

export async function discardDraftAction(id: string): Promise<ActionResult<null>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");
  try {
    const done = await data.discardDraft(id, userId);
    if (!done) return err("Blueprint not found or not authorized.");
    revalidatePath(`/blueprints/${id}`);
    return ok(null);
  } catch {
    return err("Couldn't discard the draft.");
  }
}

export async function restoreVersionAction(
  id: string,
  versionId: string,
): Promise<ActionResult<null>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");
  try {
    // Copy-forward THROUGH the draft: the editor opens with the restored content
    // for review; nothing is committed until the user Saves as a new version.
    await data.restoreVersionToDraft(id, userId, versionId);
    revalidatePath(`/blueprints/${id}`);
    revalidatePath(`/blueprints/${id}/versions`);
    return ok(null);
  } catch {
    return err("Couldn't load that version as a draft.");
  }
}

export async function setVisibilityAction(
  id: string,
  isPublic: boolean,
): Promise<ActionResult<{ isPublic: boolean; publicSlug: string | null }>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");
  try {
    const result = await data.setVisibility(id, userId, Boolean(isPublic));
    if (!result) return err("Blueprint not found or not authorized.");
    revalidatePath(`/blueprints/${id}`);
    revalidatePath("/dashboard");
    return ok(result);
  } catch {
    return err("Couldn't update sharing.");
  }
}

export async function updateMetaAction(
  id: string,
  input: { title?: string },
): Promise<ActionResult<null>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");

  const patch: { title?: string } = {};
  if (input.title !== undefined) {
    const title = validateTitle(input.title);
    if (!title.ok) return err(title.error);
    patch.title = title.value;
  }
  if (Object.keys(patch).length === 0) return ok(null);

  try {
    const done = await data.updateBlueprintMeta(id, userId, patch);
    if (!done) return err("Blueprint not found or not authorized.");
    revalidatePath(`/blueprints/${id}`);
    revalidatePath("/dashboard");
    return ok(null);
  } catch {
    return err("Couldn't update the blueprint.");
  }
}

/**
 * Owner-scoped read of a blueprint's latest-version graph + node positions, for
 * the dashboard's on-demand image export (the card doesn't carry the SQL/graph).
 */
export async function getBlueprintGraphAction(
  id: string,
): Promise<ActionResult<{ title: string; graph: ErdModel; positions: NodePositions }>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");
  try {
    const res = await data.getBlueprintForEditor(id, userId);
    if (!res) return err("Blueprint not found or not authorized.");
    if (!res.latestVersion) return err("This blueprint has no saved version to export yet.");
    if (res.latestVersion.graph.tables.length === 0)
      return err("This blueprint has no tables to export.");
    return ok({
      title: res.blueprint.title,
      graph: res.latestVersion.graph,
      positions: res.latestVersion.positions ?? {},
    });
  } catch {
    return err("Couldn't load the blueprint for export.");
  }
}

export async function deleteBlueprintAction(id: string): Promise<ActionResult<null>> {
  const userId = await getUserId();
  if (!userId) return err("You must be signed in.");
  try {
    const done = await data.deleteBlueprint(id, userId);
    if (!done) return err("Blueprint not found or not authorized.");
  } catch {
    return err("Couldn't delete the blueprint.");
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
