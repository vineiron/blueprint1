import { z } from "zod";

/**
 * Shared validation (plan A7) built on zod, used on BOTH client (pre-submit UX)
 * and server (authoritative — Server Actions never trust the client). Each
 * validator keeps the tagged `Valid<T>` return shape so call sites are unchanged.
 */

export type Valid<T> = { ok: true; value: T } | { ok: false; error: string };

export const LIMITS = {
  titleMin: 1,
  titleMax: 120,
  ddlMax: 100_000,
  noteMax: 280,
  // Graph-size caps protect the synchronous parse + ELK layout + canvas render.
  maxTables: 50,
  maxColumnsPerTable: 100,
  maxColumns: 1000,
} as const;

function run<T>(schema: z.ZodType<T>, input: unknown): Valid<T> {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, error: result.error.issues[0]?.message ?? "Invalid input." };
}

export const titleSchema = z
  .string({ error: "Title is required." })
  .trim()
  .min(LIMITS.titleMin, "Title can't be empty.")
  .max(LIMITS.titleMax, `Title must be ${LIMITS.titleMax} characters or fewer.`);

export const noteSchema = z
  .string({ error: "Note must be text." })
  .trim()
  .min(1, "Note is required.")
  .max(LIMITS.noteMax, `Note must be ${LIMITS.noteMax} characters or fewer.`);

export const ddlSchema = z
  .string({ error: "SQL is required." })
  .max(
    LIMITS.ddlMax,
    `SQL is too large (limit ${LIMITS.ddlMax.toLocaleString()} characters).`,
  );

export function validateTitle(input: unknown): Valid<string> {
  return run(titleSchema, input);
}

export function validateDdl(input: unknown): Valid<string> {
  return run(ddlSchema, input);
}

export function validateNote(input: unknown): Valid<string> {
  return run(noteSchema, input);
}

const slugSchema = z.string().regex(/^[0-9a-zA-Z]{8,32}$/);
const uuidSchema = z.uuid();

export function isValidSlug(input: unknown): input is string {
  return slugSchema.safeParse(input).success;
}

export function isUuid(input: unknown): input is string {
  return uuidSchema.safeParse(input).success;
}

interface GraphLike {
  tables: { columns: unknown[] }[];
}

/**
 * Enforce table/column caps on the parsed model (server-authoritative; also
 * usable client-side for a pre-submit warning). Keeps the CPU-heavy
 * parse→layout→render pipeline and the canvas responsive.
 */
export function validateGraphSize(model: GraphLike): Valid<true> {
  if (model.tables.length > LIMITS.maxTables)
    return {
      ok: false,
      error: `Too many tables (${model.tables.length}). The limit is ${LIMITS.maxTables}.`,
    };
  let total = 0;
  for (const t of model.tables) {
    if (t.columns.length > LIMITS.maxColumnsPerTable)
      return {
        ok: false,
        error: `A table has too many columns (${t.columns.length}). The limit is ${LIMITS.maxColumnsPerTable} per table.`,
      };
    total += t.columns.length;
  }
  if (total > LIMITS.maxColumns)
    return {
      ok: false,
      error: `Too many columns overall (${total}). The limit is ${LIMITS.maxColumns}.`,
    };
  return { ok: true, value: true };
}
