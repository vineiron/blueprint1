import { beforeEach, describe, expect, it, vi } from "vitest";

type TableName = "blueprints" | "blueprintVersions";
type Column = { table: TableName; key: string };
type Condition =
  | { op: "eq"; left: Column; right: unknown }
  | { op: "and"; conditions: Condition[] }
  | { op: "inArray"; left: Column; values: unknown[] };
type Order = { op: "desc"; column: Column } | Column;

interface BlueprintRow {
  id: string;
  ownerId: string;
  title: string;
  isPublic: boolean;
  publicSlug: string | null;
  draftSql: string | null;
  draftPositions: Record<string, { x: number; y: number }> | null;
  draftUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VersionRow {
  id: string;
  blueprintId: string;
  sql: string;
  graph: { tables: { name: string; key: string; columns: unknown[] }[]; relations: unknown[] };
  positions: Record<string, { x: number; y: number }>;
  note: string | null;
  createdAt: Date;
}

type Row = BlueprintRow | VersionRow;

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";
const BLUEPRINT_ID = "00000000-0000-4000-8000-000000000101";
const PRIVATE_BLUEPRINT_ID = "00000000-0000-4000-8000-000000000102";
const VERSION_OLD_ID = "00000000-0000-4000-8000-000000000201";
const VERSION_NEW_ID = "00000000-0000-4000-8000-000000000202";

const fake = vi.hoisted(() => {
  type MutableState = {
    rows: {
      blueprints: BlueprintRow[];
      blueprintVersions: VersionRow[];
    };
    queryCount: number;
  };

  const col = (table: TableName, key: string): Column => ({ table, key });

  const blueprints = {
    _name: "blueprints" as const,
    id: col("blueprints", "id"),
    ownerId: col("blueprints", "ownerId"),
    title: col("blueprints", "title"),
    isPublic: col("blueprints", "isPublic"),
    publicSlug: col("blueprints", "publicSlug"),
    draftSql: col("blueprints", "draftSql"),
    draftPositions: col("blueprints", "draftPositions"),
    draftUpdatedAt: col("blueprints", "draftUpdatedAt"),
    createdAt: col("blueprints", "createdAt"),
    updatedAt: col("blueprints", "updatedAt"),
  };

  const blueprintVersions = {
    _name: "blueprintVersions" as const,
    id: col("blueprintVersions", "id"),
    blueprintId: col("blueprintVersions", "blueprintId"),
    sql: col("blueprintVersions", "sql"),
    graph: col("blueprintVersions", "graph"),
    positions: col("blueprintVersions", "positions"),
    note: col("blueprintVersions", "note"),
    createdAt: col("blueprintVersions", "createdAt"),
  };

  const state: MutableState = {
    rows: { blueprints: [], blueprintVersions: [] },
    queryCount: 0,
  };

  function tableRows(table: { _name: TableName }): Row[] {
    return state.rows[table._name];
  }

  function matches(row: Row, condition: Condition | undefined): boolean {
    if (!condition) return true;
    if (condition.op === "and") return condition.conditions.every((c) => matches(row, c));
    if (condition.op === "inArray") {
      return condition.values.includes(row[condition.left.key as keyof Row]);
    }
    return row[condition.left.key as keyof Row] === condition.right;
  }

  function project<T extends Row>(
    row: T,
    selection?: Record<string, Column | unknown>,
  ): Record<string, unknown> | T {
    if (!selection) return row;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(selection)) {
      if (value && typeof value === "object" && "key" in value) {
        out[key] = row[(value as Column).key as keyof T];
      }
    }
    return out;
  }

  function sortRows(rows: Row[], orders: Order[]): Row[] {
    let sorted = [...rows];
    for (const order of [...orders].reverse()) {
      if ("op" in order && order.op === "desc") {
        sorted = sorted.sort((a, b) => {
          const av = a[order.column.key as keyof Row];
          const bv = b[order.column.key as keyof Row];
          return Number(bv instanceof Date ? bv.getTime() : bv) - Number(av instanceof Date ? av.getTime() : av);
        });
      }
    }
    return sorted;
  }

  function selectBuilder(selection?: Record<string, Column | unknown>) {
    const stateForQuery: {
      table?: { _name: TableName };
      condition?: Condition;
      orders: Order[];
      rowLimit?: number;
    } = { orders: [] };

    const run = () => {
      fake.state.queryCount++;
      const table = stateForQuery.table;
      if (!table) return [];
      const rows = sortRows(
        tableRows(table).filter((row) => matches(row, stateForQuery.condition)),
        stateForQuery.orders,
      );
      const limited =
        stateForQuery.rowLimit === undefined ? rows : rows.slice(0, stateForQuery.rowLimit);
      return limited.map((row) => project(row, selection));
    };

    const builder = {
      from(table: { _name: TableName }) {
        stateForQuery.table = table;
        return builder;
      },
      where(condition: Condition) {
        stateForQuery.condition = condition;
        return builder;
      },
      orderBy(...orders: Order[]) {
        stateForQuery.orders = orders;
        return builder;
      },
      limit(limit: number) {
        stateForQuery.rowLimit = limit;
        return Promise.resolve(run());
      },
      then<TResult1 = unknown[], TResult2 = never>(
        onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(run()).then(onfulfilled, onrejected);
      },
    };

    return builder;
  }

  const db = {
    select: vi.fn((selection?: Record<string, Column | unknown>) => selectBuilder(selection)),
    selectDistinctOn: vi.fn((_: unknown, selection?: Record<string, Column | unknown>) =>
      selectBuilder(selection),
    ),
    update: vi.fn((table: { _name: TableName }) => ({
      set(patch: Partial<BlueprintRow>) {
        return {
          where(condition: Condition) {
            return {
              returning(selection?: Record<string, Column | unknown>) {
                fake.state.queryCount++;
                const changed: Row[] = [];
                for (const row of tableRows(table)) {
                  if (!matches(row, condition)) continue;
                  Object.assign(row, patch);
                  changed.push(row);
                }
                return Promise.resolve(changed.map((row) => project(row, selection)));
              },
            };
          },
        };
      },
    })),
    delete: vi.fn((table: { _name: TableName }) => ({
      where(condition: Condition) {
        return {
          returning(selection?: Record<string, Column | unknown>) {
            fake.state.queryCount++;
            const kept: Row[] = [];
            const deleted: Row[] = [];
            for (const row of tableRows(table)) {
              if (matches(row, condition)) deleted.push(row);
              else kept.push(row);
            }
            state.rows[table._name] = kept as never;
            return Promise.resolve(deleted.map((row) => project(row, selection)));
          },
        };
      },
    })),
    insert: vi.fn(),
    transaction: vi.fn(),
  };

  return { blueprintVersions, blueprints, db, state };
});

vi.mock("react", () => ({
  cache: <Args extends unknown[], Return>(fn: (...args: Args) => Return) => fn,
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: Condition[]) => ({ op: "and", conditions }),
  count: () => ({ op: "count" }),
  desc: (column: Column) => ({ op: "desc", column }),
  eq: (left: Column, right: unknown) => ({ op: "eq", left, right }),
  inArray: (left: Column, values: unknown[]) => ({ op: "inArray", left, values }),
}));

vi.mock("@/db", () => ({
  db: fake.db,
}));

vi.mock("@/db/schema", () => ({
  blueprintVersions: fake.blueprintVersions,
  blueprints: fake.blueprints,
}));

function seedRows() {
  const publicGraph = {
    tables: [{ name: "users", key: "users", columns: [{ name: "id" }] }],
    relations: [],
  };
  const privateGraph = {
    tables: [{ name: "secrets", key: "secrets", columns: [{ name: "id" }] }],
    relations: [],
  };

  fake.state.rows.blueprints = [
    {
      id: BLUEPRINT_ID,
      ownerId: OWNER_ID,
      title: "Public schema",
      isPublic: true,
      publicSlug: "PublicSlug12",
      draftSql: "create table leaked_draft(id uuid primary key);",
      draftPositions: { leaked_draft: { x: 999, y: 999 } },
      draftUpdatedAt: new Date("2026-01-03T00:00:00Z"),
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-04T00:00:00Z"),
    },
    {
      id: PRIVATE_BLUEPRINT_ID,
      ownerId: OWNER_ID,
      title: "Private schema",
      isPublic: false,
      publicSlug: "PrivateSlug1",
      draftSql: null,
      draftPositions: null,
      draftUpdatedAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    },
  ];

  fake.state.rows.blueprintVersions = [
    {
      id: VERSION_OLD_ID,
      blueprintId: BLUEPRINT_ID,
      sql: "create table old_users(id uuid primary key);",
      graph: publicGraph,
      positions: { old_users: { x: 10, y: 10 } },
      note: "old",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: VERSION_NEW_ID,
      blueprintId: BLUEPRINT_ID,
      sql: "create table users(id uuid primary key);",
      graph: publicGraph,
      positions: { users: { x: 20, y: 20 } },
      note: "new",
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
    {
      id: "00000000-0000-4000-8000-000000000203",
      blueprintId: PRIVATE_BLUEPRINT_ID,
      sql: "create table secrets(id uuid primary key);",
      graph: privateGraph,
      positions: { secrets: { x: 30, y: 30 } },
      note: "private",
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  fake.state.queryCount = 0;
  seedRows();
});

describe("blueprint data authorization", () => {
  it("returns owner-scoped blueprints only to the owner", async () => {
    const { getOwnedBlueprint } = await import("./blueprints");

    await expect(getOwnedBlueprint(BLUEPRINT_ID, OWNER_ID)).resolves.toMatchObject({
      id: BLUEPRINT_ID,
      ownerId: OWNER_ID,
    });
    await expect(getOwnedBlueprint(BLUEPRINT_ID, OTHER_ID)).resolves.toBeNull();
  });

  it("rejects invalid ids before querying the database", async () => {
    const { deleteBlueprint, getOwnedBlueprint, updateDraft } = await import("./blueprints");

    await expect(getOwnedBlueprint("not-a-uuid", OWNER_ID)).resolves.toBeNull();
    await expect(
      updateDraft(BLUEPRINT_ID, "not-a-uuid", {
        sql: "create table nope(id uuid primary key);",
        positions: {},
      }),
    ).resolves.toBe(false);
    await expect(deleteBlueprint("not-a-uuid", OWNER_ID)).resolves.toBe(false);
    expect(fake.state.queryCount).toBe(0);
  });

  it("denies non-owner draft updates and deletes", async () => {
    const { deleteBlueprint, updateDraft } = await import("./blueprints");

    await expect(
      updateDraft(BLUEPRINT_ID, OTHER_ID, {
        sql: "create table attacker(id uuid primary key);",
        positions: { attacker: { x: 1, y: 2 } },
      }),
    ).resolves.toBe(false);
    expect(fake.state.rows.blueprints[0]?.draftSql).toBe(
      "create table leaked_draft(id uuid primary key);",
    );

    await expect(deleteBlueprint(BLUEPRINT_ID, OTHER_ID)).resolves.toBe(false);
    expect(fake.state.rows.blueprints.map((row) => row.id)).toContain(BLUEPRINT_ID);
  });
});

describe("public blueprint reads", () => {
  it("returns only viewer-safe fields from the latest saved version", async () => {
    const { getPublicBlueprint } = await import("./blueprints");

    const result = await getPublicBlueprint("PublicSlug12");

    expect(result).toEqual({
      id: BLUEPRINT_ID,
      title: "Public schema",
      sql: "create table users(id uuid primary key);",
      graph: {
        tables: [{ name: "users", key: "users", columns: [{ name: "id" }] }],
        relations: [],
      },
      positions: { users: { x: 20, y: 20 } },
      updatedAt: new Date("2026-01-04T00:00:00Z"),
    });
    expect(result).not.toHaveProperty("ownerId");
    expect(result).not.toHaveProperty("draftSql");
    expect(result).not.toHaveProperty("draftPositions");
    expect(result).not.toHaveProperty("versions");
  });

  it("does not return private or invalid share slugs", async () => {
    const { getPublicBlueprint } = await import("./blueprints");

    await expect(getPublicBlueprint("PrivateSlug1")).resolves.toBeNull();
    await expect(getPublicBlueprint("not-a-valid-slug!")).resolves.toBeNull();
  });

  it("invalidates the public share slug when unpublished", async () => {
    const { getPublicBlueprint, setVisibility } = await import("./blueprints");

    await expect(setVisibility(BLUEPRINT_ID, OWNER_ID, false)).resolves.toEqual({
      isPublic: false,
      publicSlug: null,
    });
    expect(fake.state.rows.blueprints[0]?.publicSlug).toBeNull();
    await expect(getPublicBlueprint("PublicSlug12")).resolves.toBeNull();
  });
});
