import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ErdRelation, ErdTable, NodePositions } from "@/lib/sql/types";

// Owner identity comes from the Supabase session (auth.users); `ownerId` below
// stores that user id directly. No local profiles mirror for now.
export const blueprints = pgTable(
  "blueprints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    title: text("title").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    publicSlug: text("public_slug").unique(),
    // Persisted, uncommitted edit state. Null when there's no draft.
    draftSql: text("draft_sql"),
    draftPositions: jsonb("draft_positions").$type<NodePositions>(),
    draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("blueprints_owner_id_idx").on(t.ownerId),
    index("blueprints_owner_updated_idx").on(t.ownerId, t.updatedAt),
  ],
  // Closes the table to Supabase's REST API (PostgREST). The app connects as
  // the table owner through DATABASE_URL, which bypasses RLS, so owner checks
  // in src/server/data remain the runtime authorization boundary.
).enableRLS();

export const blueprintVersions = pgTable(
  "blueprint_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blueprintId: uuid("blueprint_id")
      .notNull()
      .references(() => blueprints.id, { onDelete: "cascade" }),
    sql: text("sql").notNull(),
    // Authoritative parsed model (server-computed at commit time).
    graph: jsonb("graph")
      .$type<{ tables: ErdTable[]; relations: ErdRelation[] }>()
      .notNull(),
    // Manual node arrangement, kept separate from the parsed model.
    positions: jsonb("positions").$type<NodePositions>().notNull().default({}),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("blueprint_versions_blueprint_idx").on(t.blueprintId),
    index("blueprint_versions_blueprint_created_idx").on(t.blueprintId, t.createdAt),
  ],
).enableRLS();

export const blueprintsRelations = relations(blueprints, ({ many }) => ({
  versions: many(blueprintVersions),
}));

export const blueprintVersionsRelations = relations(blueprintVersions, ({ one }) => ({
  blueprint: one(blueprints, {
    fields: [blueprintVersions.blueprintId],
    references: [blueprints.id],
  }),
}));

export type Blueprint = typeof blueprints.$inferSelect;
export type NewBlueprint = typeof blueprints.$inferInsert;
export type BlueprintVersion = typeof blueprintVersions.$inferSelect;
export type NewBlueprintVersion = typeof blueprintVersions.$inferInsert;
