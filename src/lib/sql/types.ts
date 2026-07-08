/** Parsed ERD model shared by the parser, the canvas, and persisted graphs. */

export interface ErdColumn {
  name: string;
  /** Display type, e.g. "varchar(255)", "uuid", "int[]". */
  type: string;
  nullable: boolean;
  pk: boolean;
  unique: boolean;
  /** True when this column is the source of at least one foreign key. */
  fk: boolean;
  default: string | null;
  /** Column comment (from `COMMENT ON COLUMN`), shown on hover. */
  comment?: string;
  /** Column-level CHECK expression, shown on hover. */
  check?: string;
  /** Allowed values when the column's type is a Postgres ENUM. */
  enumValues?: string[];
  /** FK target for this column (set during graph build) — for inline "→ table.col". */
  fkTarget?: { table: string; column: string; onDelete?: string };
}

export interface ErdIndex {
  name?: string;
  columns: string[];
  unique: boolean;
}

export interface ErdTable {
  schema?: string;
  name: string;
  /** Stable identity used as the React Flow node id ("schema.table" or "table"). */
  key: string;
  columns: ErdColumn[];
  /** Table comment (from `COMMENT ON TABLE`). */
  comment?: string;
  /** Table-level CHECK expressions. */
  checks?: string[];
  /** Indexes (from `CREATE INDEX` and table-level UNIQUE/PK constraints). */
  indexes?: ErdIndex[];
}

export type Cardinality = "one-to-one" | "one-to-many";

export interface ErdRelation {
  /** Stable id used as the React Flow edge id. */
  id: string;
  fromTable: string;
  /** Representative local column (first pair) — used for handle attachment. */
  fromColumn: string;
  toTable: string;
  /** Representative foreign column (first pair) — used for handle attachment. */
  toColumn: string;
  /**
   * All ordered (local → foreign) column pairs in this FK constraint. One
   * relation per constraint; composite FKs carry more than one pair. Optional so
   * graphs persisted before this field still deserialize.
   */
  columns?: { from: string; to: string }[];
  name?: string;
  cardinality: Cardinality;
  /**
   * Child participation: true when the FK column(s) are nullable (a row may have
   * no parent → "zero-or-..."). Drives crow's-foot open-circle vs bar. Optional
   * so graphs persisted before this field still deserialize.
   */
  optional?: boolean;
  /** Referential actions, e.g. "cascade", "set null". */
  onDelete?: string;
  onUpdate?: string;
}

export interface ErdModel {
  tables: ErdTable[];
  relations: ErdRelation[];
}

/** node id -> canvas position (persisted so manual arrangement survives). */
export type NodePositions = Record<string, { x: number; y: number }>;

/** What we persist per version / draft. */
export interface BlueprintGraph {
  tables: ErdTable[];
  relations: ErdRelation[];
  positions: NodePositions;
}

export type ParseResult =
  | { ok: true; model: ErdModel; warning?: string }
  | { ok: false; error: string; line?: number; column?: number };

export const EMPTY_MODEL: ErdModel = { tables: [], relations: [] };
