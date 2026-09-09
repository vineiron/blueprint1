import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/lib/templates";
import { parseSql } from "./parser";
import type { ErdModel } from "./types";

function model(sql: string): ErdModel {
  const result = parseSql(sql);
  if (!result.ok) throw new Error(`expected ok parse, got: ${result.error}`);
  return result.model;
}

function table(m: ErdModel, key: string) {
  const t = m.tables.find((x) => x.key === key);
  if (!t)
    throw new Error(
      `table ${key} not found in ${m.tables.map((x) => x.key).join(", ")}`,
    );
  return t;
}

function column(m: ErdModel, tableKey: string, name: string) {
  const c = table(m, tableKey).columns.find((x) => x.name === name);
  if (!c) throw new Error(`column ${tableKey}.${name} not found`);
  return c;
}

describe("parseSql: input handling", () => {
  it("returns an empty model for blank input", () => {
    const result = parseSql("   \n\t ");
    expect(result).toEqual({ ok: true, model: { tables: [], relations: [] } });
  });

  it("fails with a location when nothing can be parsed", () => {
    const result = parseSql("this is not sql at all");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("\n");
    expect(result.line).toBe(1);
  });

  it("keeps the valid tables when one statement is broken", () => {
    const result = parseSql(`
      CREATE TABLE users (id uuid PRIMARY KEY);
      CREATE TABLE broken (;
      CREATE TABLE posts (id uuid PRIMARY KEY);
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.tables.map((t) => t.key)).toEqual(["users", "posts"]);
    expect(result.warning).toMatch(/skipped/i);
  });

  it("ignores non-DDL statements and says so", () => {
    const result = parseSql(`
      CREATE TABLE users (id uuid PRIMARY KEY);
      INSERT INTO users (id) VALUES (gen_random_uuid());
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.tables).toHaveLength(1);
    expect(result.warning).toBe("1 non-table statement ignored.");
  });
});

describe("parseSql: tables and columns", () => {
  const m = model(`
    CREATE TYPE post_status AS ENUM ('draft', 'published');
    CREATE TABLE app.posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      title varchar(255) NOT NULL,
      body text,
      status post_status NOT NULL DEFAULT 'draft',
      views int NOT NULL DEFAULT 0 CHECK (views >= 0)
    );
    COMMENT ON TABLE app.posts IS 'Blog posts';
    COMMENT ON COLUMN app.posts.body IS 'Markdown';
  `);

  it("keys schema-qualified tables as schema.table", () => {
    const t = table(m, "app.posts");
    expect(t.schema).toBe("app");
    expect(t.name).toBe("posts");
  });

  it("captures primary key, unique, nullable, default, and type", () => {
    expect(column(m, "app.posts", "id")).toMatchObject({
      pk: true,
      nullable: false,
      type: "uuid",
    });
    expect(column(m, "app.posts", "id").default).toMatch(
      /^gen_random_uuid ?\(\)$/,
    );
    expect(column(m, "app.posts", "slug")).toMatchObject({
      unique: true,
      nullable: false,
    });
    expect(column(m, "app.posts", "title").type).toMatch(/^varchar ?\(255\)$/);
    expect(column(m, "app.posts", "body").nullable).toBe(true);
  });

  it("attaches enum values to columns of an enum type", () => {
    expect(column(m, "app.posts", "status").enumValues).toEqual([
      "draft",
      "published",
    ]);
  });

  it("keeps column-level CHECK expressions", () => {
    expect(column(m, "app.posts", "views").check).toContain("views");
  });

  it("applies COMMENT ON table and column", () => {
    expect(table(m, "app.posts").comment).toBe("Blog posts");
    expect(column(m, "app.posts", "body").comment).toBe("Markdown");
  });
});

describe("parseSql: relationships", () => {
  it("builds a required one-to-many edge from an inline NOT NULL foreign key", () => {
    const m = model(`
      CREATE TABLE customers (id uuid PRIMARY KEY);
      CREATE TABLE orders (
        id uuid PRIMARY KEY,
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
      );
    `);
    expect(m.relations).toHaveLength(1);
    expect(m.relations[0]).toMatchObject({
      fromTable: "orders",
      fromColumn: "customer_id",
      toTable: "customers",
      toColumn: "id",
      cardinality: "one-to-many",
      optional: false,
      columns: [{ from: "customer_id", to: "id" }],
    });
    expect(m.relations[0].onDelete?.toLowerCase()).toBe("restrict");
    expect(column(m, "orders", "customer_id")).toMatchObject({
      fk: true,
      fkTarget: { table: "customers", column: "id" },
    });
  });

  it("marks a nullable foreign key as optional", () => {
    const m = model(`
      CREATE TABLE categories (id uuid PRIMARY KEY);
      CREATE TABLE products (id uuid PRIMARY KEY, category_id uuid REFERENCES categories(id));
    `);
    expect(m.relations[0].optional).toBe(true);
  });

  it("treats a UNIQUE foreign key as one-to-one", () => {
    const m = model(`
      CREATE TABLE users (id uuid PRIMARY KEY);
      CREATE TABLE profiles (id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE REFERENCES users(id));
    `);
    expect(m.relations[0].cardinality).toBe("one-to-one");
  });

  it("keeps every column pair of a composite foreign key on one edge", () => {
    const m = model(`
      CREATE TABLE tenants_users (tenant_id uuid, user_id uuid, PRIMARY KEY (tenant_id, user_id));
      CREATE TABLE memberships (
        id uuid PRIMARY KEY,
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        FOREIGN KEY (tenant_id, user_id) REFERENCES tenants_users(tenant_id, user_id)
      );
    `);
    expect(m.relations).toHaveLength(1);
    expect(m.relations[0].columns).toEqual([
      { from: "tenant_id", to: "tenant_id" },
      { from: "user_id", to: "user_id" },
    ]);
  });

  it("supports self-referencing tables", () => {
    const m = model(`
      CREATE TABLE categories (id uuid PRIMARY KEY, parent_id uuid REFERENCES categories(id));
    `);
    expect(m.relations[0]).toMatchObject({
      fromTable: "categories",
      toTable: "categories",
    });
  });

  it("resolves an unqualified REFERENCES to a schema-qualified table", () => {
    const m = model(`
      CREATE TABLE app.users (id uuid PRIMARY KEY);
      CREATE TABLE app.posts (id uuid PRIMARY KEY, author_id uuid NOT NULL REFERENCES users(id));
    `);
    expect(m.relations[0]).toMatchObject({
      fromTable: "app.posts",
      toTable: "app.users",
    });
  });

  it("reports a dangling foreign key without drawing an edge", () => {
    const result = parseSql(`
      CREATE TABLE orders (id uuid PRIMARY KEY, customer_id uuid REFERENCES customers(id));
    `);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.relations).toHaveLength(0);
    expect(result.warning).toBe(
      "1 foreign key reference a table not in this SQL.",
    );
    expect(column(result.model, "orders", "customer_id")).toMatchObject({
      fk: true,
      fkTarget: { table: "customers", column: "id" },
    });
  });
});

describe("parseSql: indexes", () => {
  it("collects CREATE INDEX and table-level UNIQUE constraints", () => {
    const m = model(`
      CREATE TABLE orders (
        id uuid PRIMARY KEY,
        customer_id uuid NOT NULL,
        number text NOT NULL,
        UNIQUE (customer_id, number)
      );
      CREATE INDEX orders_customer_idx ON orders (customer_id);
    `);
    const indexes = table(m, "orders").indexes ?? [];
    expect(indexes).toContainEqual(
      expect.objectContaining({
        columns: ["customer_id", "number"],
        unique: true,
      }),
    );
    expect(indexes).toContainEqual(
      expect.objectContaining({
        name: "orders_customer_idx",
        columns: ["customer_id"],
        unique: false,
      }),
    );
  });
});

describe("parseSql: shipped templates", () => {
  it.each(
    TEMPLATES.map((t) => [t.name, t] as const),
  )("parses the %s template cleanly", (_, t) => {
    const result = parseSql(t.sql);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warning).toBeUndefined();
    expect(result.model.tables).toHaveLength(t.tableCount);
    expect(result.model.relations.length).toBeGreaterThan(0);
  });
});
