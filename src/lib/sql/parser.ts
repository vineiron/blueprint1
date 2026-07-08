import { parse, toSql } from "pgsql-ast-parser";
import {
  type Cardinality,
  type ErdColumn,
  type ErdIndex,
  type ErdModel,
  type ErdRelation,
  type ErdTable,
  EMPTY_MODEL,
  type ParseResult,
} from "./types";

/*
 * Loose AST shapes — verified against pgsql-ast-parser@12.0.2 (syntax/ast.d.ts).
 * Kept local so the mapper is resilient to minor type-name churn in the library.
 */
interface QName {
  name: string;
  schema?: string;
}
interface NameRef {
  name: string;
}
interface ColumnConstraint {
  type: string;
  default?: unknown;
  expr?: unknown; // check
  foreignTable?: QName;
  foreignColumns?: NameRef[];
  onDelete?: string;
  onUpdate?: string;
  constraintName?: NameRef;
}
interface ColumnDef {
  kind?: string;
  name: NameRef;
  dataType: unknown;
  constraints?: ColumnConstraint[];
}
interface TableConstraint {
  type: string;
  columns?: NameRef[];
  localColumns?: NameRef[];
  foreignTable?: QName;
  foreignColumns?: NameRef[];
  onDelete?: string;
  onUpdate?: string;
  expr?: unknown; // check
  constraintName?: NameRef;
}
interface CreateTableStatement {
  type: "create table";
  name: QName;
  columns: ColumnDef[];
  constraints?: TableConstraint[];
}
interface AlterTableChange {
  type: string;
  constraint?: TableConstraint;
}
interface AlterTableStatement {
  type: "alter table";
  table: QName;
  changes?: AlterTableChange[];
  change?: AlterTableChange;
}
interface CreateEnumStatement {
  type: "create enum";
  name: QName;
  values: { value: string }[];
}
interface CreateIndexStatement {
  type: "create index";
  table: QName;
  expressions?: { expression?: { type?: string; name?: string } }[];
  unique?: boolean;
  indexName?: NameRef;
}
interface CommentStatement {
  type: "comment";
  comment: string;
  on:
    | { type: "table"; name: QName }
    | { type: "column"; column: { table: string; column: string; schema?: string } }
    | { type: string; name?: QName };
}

interface FkSpec {
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  name?: string;
  onDelete?: string;
  onUpdate?: string;
}

const renderType = (node: unknown): string =>
  cleanSql((toSql.dataType as (n: never) => string)(node as never));
const renderExpr = (node: unknown): string =>
  cleanSql((toSql.expr as (n: never) => string)(node as never));

function cleanSql(sql: string): string {
  return sql
    .trim()
    .replace(/^\(([\s\S]*)\)$/, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function qkey(q: QName): string {
  return q.schema ? `${q.schema}.${q.name}` : q.name;
}

/** Normalize a column type to its bare base name (strip array []/precision/quotes) for enum lookup. */
function baseTypeKey(typeStr: string): string {
  return typeStr
    .replace(/\[\]/g, "")
    .replace(/\(.*\)$/, "")
    .replace(/"/g, "") // toSql double-quotes mixed-case identifiers; drop them for matching
    .trim()
    .toLowerCase();
}

function collectEnums(statements: unknown[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const st of statements) {
    if ((st as { type?: string }).type === "create enum") {
      const e = st as CreateEnumStatement;
      const values = (e.values ?? []).map((v) => v.value);
      map.set(e.name.name.toLowerCase(), values);
      map.set(qkey(e.name).toLowerCase(), values);
    }
  }
  return map;
}

function applyTableConstraint(
  tc: TableConstraint,
  table: ErdTable,
  fks: FkSpec[],
): void {
  if (tc.type === "primary key" && tc.columns) {
    const pkNames = new Set(tc.columns.map((n) => n.name));
    for (const col of table.columns) {
      if (pkNames.has(col.name)) {
        col.pk = true;
        col.nullable = false;
      }
    }
  } else if (tc.type === "unique" && tc.columns) {
    if (tc.columns.length === 1) {
      const col = table.columns.find((x) => x.name === tc.columns?.[0]?.name);
      if (col) col.unique = true;
    } else if (tc.columns.length > 1) {
      // Composite UNIQUE: surface as an index (individual columns aren't unique).
      (table.indexes ??= []).push({
        name: tc.constraintName?.name,
        columns: tc.columns.map((n) => n.name),
        unique: true,
      });
    }
  } else if (tc.type === "check" && tc.expr) {
    (table.checks ??= []).push(renderExpr(tc.expr));
  } else if (tc.type === "foreign key" && tc.foreignTable) {
    fks.push({
      fromTable: table.key,
      fromColumns: (tc.localColumns ?? []).map((n) => n.name),
      toTable: qkey(tc.foreignTable),
      toColumns: (tc.foreignColumns ?? []).map((n) => n.name),
      name: tc.constraintName?.name,
      onDelete: tc.onDelete,
      onUpdate: tc.onUpdate,
    });
  }
}

function mapCreateTable(
  st: CreateTableStatement,
  tables: ErdTable[],
  fks: FkSpec[],
  enums: Map<string, string[]>,
): void {
  const tableKey = qkey(st.name);
  const columns: ErdColumn[] = [];

  for (const c of st.columns) {
    if (c.kind && c.kind !== "column") continue; // skip `LIKE other_table`
    const cons = c.constraints ?? [];
    const name = c.name.name;
    const def = cons.find((x) => x.type === "default");
    const check = cons.find((x) => x.type === "check");
    const type = renderType(c.dataType);
    const enumValues = enums.get(baseTypeKey(type));

    columns.push({
      name,
      type,
      nullable: !cons.some((x) => x.type === "not null" || x.type === "primary key"),
      pk: cons.some((x) => x.type === "primary key"),
      unique: cons.some((x) => x.type === "unique"),
      fk: false,
      default: def?.default !== undefined ? renderExpr(def.default) : null,
      check: check?.expr !== undefined ? renderExpr(check.expr) : undefined,
      enumValues: enumValues ? [...enumValues] : undefined,
    });

    // Inline FK: `col uuid REFERENCES other(id) ON DELETE CASCADE`
    for (const ref of cons.filter((x) => x.type === "reference")) {
      if (!ref.foreignTable) continue;
      fks.push({
        fromTable: tableKey,
        fromColumns: [name],
        toTable: qkey(ref.foreignTable),
        toColumns: (ref.foreignColumns ?? []).map((n) => n.name),
        name: ref.constraintName?.name,
        onDelete: ref.onDelete,
        onUpdate: ref.onUpdate,
      });
    }
  }

  const table: ErdTable = {
    schema: st.name.schema,
    name: st.name.name,
    key: tableKey,
    columns,
  };
  tables.push(table);

  for (const tc of st.constraints ?? []) {
    applyTableConstraint(tc, table, fks);
  }
}

function applyAlterTable(
  st: AlterTableStatement,
  tables: ErdTable[],
  fks: FkSpec[],
): boolean {
  const tableKey = qkey(st.table);
  const target =
    tables.find((t) => t.key === tableKey) ??
    tables.find((t) => t.name === st.table.name);
  if (!target) return false;

  const changes = st.changes ?? (st.change ? [st.change] : []);
  let applied = false;
  for (const change of changes) {
    if (change.type === "add constraint" && change.constraint) {
      applyTableConstraint(change.constraint, target, fks);
      applied = true;
    }
  }
  return applied;
}

function applyIndex(st: CreateIndexStatement, tables: ErdTable[]): boolean {
  const tableKey = qkey(st.table);
  const target =
    tables.find((t) => t.key === tableKey) ??
    tables.find((t) => t.name === st.table.name);
  if (!target) return false;

  const columns = (st.expressions ?? [])
    .map((e) => {
      const ex = e?.expression;
      if (ex && ex.type === "ref" && typeof ex.name === "string") return ex.name;
      return ex ? cleanSql(renderExpr(ex)) : "";
    })
    .filter(Boolean);

  const index: ErdIndex = {
    name: st.indexName?.name,
    columns,
    unique: Boolean(st.unique),
  };
  (target.indexes ??= []).push(index);
  return true;
}

function applyComment(st: CommentStatement, tables: ErdTable[]): boolean {
  const on = st.on;
  if (on.type === "table" && "name" in on && on.name) {
    const key = qkey(on.name);
    const t = tables.find((x) => x.key === key) ?? tables.find((x) => x.name === on.name?.name);
    if (t) {
      t.comment = st.comment;
      return true;
    }
  } else if (on.type === "column" && "column" in on && on.column) {
    const c = on.column;
    const tableKey = qkey({ name: c.table, schema: c.schema });
    const t =
      tables.find((x) => x.key === tableKey) ?? tables.find((x) => x.name === c.table);
    const col = t?.columns.find((x) => x.name === c.column);
    if (col) {
      col.comment = st.comment;
      return true;
    }
  }
  return false;
}

function buildModel(
  tables: ErdTable[],
  fks: FkSpec[],
): { model: ErdModel; danglingCount: number } {
  const byKey = new Map(tables.map((t) => [t.key, t]));
  const byName = new Map(tables.map((t) => [t.name, t]));
  const resolve = (key: string): ErdTable | undefined =>
    byKey.get(key) ?? byName.get(key.includes(".") ? (key.split(".").pop() ?? key) : key);

  const relations: ErdRelation[] = [];
  let counter = 0;
  let danglingCount = 0;

  for (const fk of fks) {
    const fromTable = byKey.get(fk.fromTable) ?? byName.get(fk.fromTable);
    const toTable = resolve(fk.toTable);
    if (!fromTable || !toTable) {
      danglingCount++;
      // Can't draw an edge to a missing table, but still annotate the source
      // columns so a written REFERENCES communicates as an FK on the node.
      if (fromTable) {
        const targetName = fk.toTable.includes(".")
          ? (fk.toTable.split(".").pop() ?? fk.toTable)
          : fk.toTable;
        for (let i = 0; i < Math.max(fk.fromColumns.length, 1); i++) {
          const fromColumn = fk.fromColumns[i];
          if (!fromColumn) continue;
          const sc = fromTable.columns.find((c) => c.name === fromColumn);
          if (sc) {
            sc.fk = true;
            sc.fkTarget = {
              table: targetName,
              column: fk.toColumns[i] ?? fk.toColumns[0] ?? "",
              onDelete: fk.onDelete,
            };
          }
        }
      }
      continue;
    }

    const pairCount = Math.max(fk.fromColumns.length, 1);
    const pairs: { from: string; to: string }[] = [];
    for (let i = 0; i < pairCount; i++) {
      const fromColumn = fk.fromColumns[i];
      if (!fromColumn) continue;
      const toColumn =
        fk.toColumns[i] ??
        fk.toColumns[0] ??
        toTable.columns.find((c) => c.pk)?.name ??
        "";
      const sourceCol = fromTable.columns.find((c) => c.name === fromColumn);
      if (sourceCol) {
        sourceCol.fk = true;
        sourceCol.fkTarget = {
          table: toTable.name,
          column: toColumn,
          onDelete: fk.onDelete,
        };
      }
      pairs.push({ from: fromColumn, to: toColumn });
    }
    if (pairs.length === 0) continue;

    const oneToOne = pairs.every(({ from }) => {
      const c = fromTable.columns.find((x) => x.name === from);
      return c ? c.unique || c.pk : false;
    });
    const cardinality: Cardinality = oneToOne ? "one-to-one" : "one-to-many";
    const optional = pairs.some(({ from }) => {
      const c = fromTable.columns.find((x) => x.name === from);
      return c ? c.nullable : false;
    });
    const rep = pairs[0];

    relations.push({
      id: `fk-${counter++}-${fromTable.key}.${rep.from}->${toTable.key}.${rep.to}`,
      fromTable: fromTable.key,
      fromColumn: rep.from,
      toTable: toTable.key,
      toColumn: rep.to,
      columns: pairs,
      name: fk.name,
      cardinality,
      optional,
      onDelete: fk.onDelete,
      onUpdate: fk.onUpdate,
    });
  }

  return { model: { tables, relations }, danglingCount };
}

interface MapResult {
  model: ErdModel;
  ignoredCount: number;
  danglingCount: number;
}

function mapStatements(statements: unknown[]): MapResult {
  const enums = collectEnums(statements);
  const tables: ErdTable[] = [];
  const fks: FkSpec[] = [];
  const alters: AlterTableStatement[] = [];
  const indexes: CreateIndexStatement[] = [];
  const comments: CommentStatement[] = [];
  let recognized = 0;

  for (const st of statements) {
    const type = (st as { type?: string }).type;
    if (type === "create table") {
      mapCreateTable(st as CreateTableStatement, tables, fks, enums);
      recognized++;
    } else if (type === "alter table") {
      alters.push(st as AlterTableStatement);
    } else if (type === "create enum") {
      recognized++; // collected above
    } else if (type === "create index") {
      indexes.push(st as CreateIndexStatement);
    } else if (type === "comment") {
      comments.push(st as CommentStatement);
    }
  }

  for (const a of alters) if (applyAlterTable(a, tables, fks)) recognized++;
  for (const ix of indexes) if (applyIndex(ix, tables)) recognized++;
  for (const cm of comments) if (applyComment(cm, tables)) recognized++;

  const { model, danglingCount } = buildModel(tables, fks);
  return {
    model,
    ignoredCount: Math.max(0, statements.length - recognized),
    danglingCount,
  };
}

function toParseError(e: unknown): { error: string; line?: number; column?: number } {
  const raw = e instanceof Error ? e.message : "Invalid SQL.";
  const m = /line (\d+) col (\d+)/i.exec(raw);
  // pgsql-ast-parser errors append a huge "state of my parse table" dump — keep
  // only the human-readable first line.
  const message = raw.split("\n")[0].slice(0, 200);
  return {
    error: message,
    line: m ? Number(m[1]) : undefined,
    column: m ? Number(m[2]) : undefined,
  };
}

/**
 * Split SQL into statements on top-level `;`, skipping single-quoted strings,
 * double-quoted identifiers, dollar-quoted bodies ($tag$...$tag$), and line/block
 * comments. Used only for best-effort recovery when a whole-input parse fails.
 */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  const n = sql.length;
  let i = 0;

  while (i < n) {
    const ch = sql[i];

    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      const end = nl === -1 ? n : nl;
      buf += sql.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const close = sql.indexOf("*/", i + 2);
      const end = close === -1 ? n : close + 2;
      buf += sql.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          j += 1;
          break;
        }
        j += 1;
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === '"' && sql[j + 1] === '"') {
          j += 2;
          continue;
        }
        if (sql[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      buf += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === "$") {
      const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i))?.[0];
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length);
        const end = close === -1 ? n : close + tag.length;
        buf += sql.slice(i, end);
        i = end;
        continue;
      }
    }
    if (ch === ";") {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  if (buf.trim()) out.push(buf.trim());
  return out;
}

function bestEffort(sql: string): MapResult & { firstError?: string } {
  const collected: unknown[] = [];
  let firstError: string | undefined;
  let skippedStatements = 0;
  for (const stmt of splitStatements(sql)) {
    try {
      collected.push(...parse(stmt));
    } catch (e) {
      skippedStatements++;
      if (!firstError) {
        firstError = (e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 160);
      }
    }
  }
  const mapped = mapStatements(collected);
  return {
    ...mapped,
    ignoredCount: mapped.ignoredCount + skippedStatements,
    firstError,
  };
}

function buildWarning(parts: {
  ignoredCount: number;
  danglingCount: number;
  parseError?: string;
}): string | undefined {
  const segments: string[] = [];
  if (parts.parseError) {
    segments.push(`some statements couldn't be parsed and were skipped (${parts.parseError})`);
  } else if (parts.ignoredCount > 0) {
    segments.push(
      `${parts.ignoredCount} non-table statement${parts.ignoredCount === 1 ? "" : "s"} ignored`,
    );
  }
  if (parts.danglingCount > 0) {
    segments.push(
      `${parts.danglingCount} foreign key${parts.danglingCount === 1 ? "" : "s"} reference a table not in this SQL`,
    );
  }
  if (segments.length === 0) return undefined;
  const text = segments.join("; ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/**
 * Parse PostgreSQL DDL into an ERD model.
 * Tries the whole input first; on a syntax error, falls back to best-effort
 * per-statement parsing so one bad statement doesn't blank the whole blueprint.
 */
export function parseSql(sql: string): ParseResult {
  const trimmed = sql.trim();
  if (!trimmed) return { ok: true, model: EMPTY_MODEL };

  try {
    const { model, ignoredCount, danglingCount } = mapStatements(parse(trimmed));
    return { ok: true, model, warning: buildWarning({ ignoredCount, danglingCount }) };
  } catch (e) {
    const { model, firstError, ignoredCount, danglingCount } = bestEffort(trimmed);
    if (model.tables.length > 0) {
      return {
        ok: true,
        model,
        warning: buildWarning({ ignoredCount, danglingCount, parseError: firstError }),
      };
    }
    return { ok: false, ...toParseError(e) };
  }
}
