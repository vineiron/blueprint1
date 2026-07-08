import { describe, expect, it } from "vitest";
import { parseSql } from "./parser";

function ok(sql: string) {
  const r = parseSql(sql);
  if (!r.ok) throw new Error(`expected parse to succeed, got: ${r.error}`);
  return r;
}

describe("parseSql", () => {
  it("parses a single table with PK / NOT NULL / UNIQUE", () => {
    const { model } = ok(
      `CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL UNIQUE);`,
    );
    expect(model.tables).toHaveLength(1);
    const t = model.tables[0];
    expect(t.name).toBe("users");
    const id = t.columns.find((c) => c.name === "id");
    expect(id?.pk).toBe(true);
    expect(id?.nullable).toBe(false);
    const email = t.columns.find((c) => c.name === "email");
    expect(email?.unique).toBe(true);
    expect(email?.nullable).toBe(false);
  });

  it("derives one edge from an inline FK and flags the source column", () => {
    const { model } = ok(
      `CREATE TABLE a (id uuid PRIMARY KEY);
       CREATE TABLE b (id uuid PRIMARY KEY, a_id uuid REFERENCES a(id));`,
    );
    expect(model.relations).toHaveLength(1);
    const r = model.relations[0];
    expect(r.fromTable).toBe("b");
    expect(r.toTable).toBe("a");
    expect(r.cardinality).toBe("one-to-many");
    const aId = model.tables
      .find((t) => t.name === "b")
      ?.columns.find((c) => c.name === "a_id");
    expect(aId?.fk).toBe(true);
  });

  it("treats a composite FK as ONE edge carrying both column pairs", () => {
    const { model } = ok(
      `CREATE TABLE parent (a int, b int, PRIMARY KEY (a, b));
       CREATE TABLE child (a int, b int, FOREIGN KEY (a, b) REFERENCES parent (a, b));`,
    );
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].columns).toHaveLength(2);
  });

  it("applies ALTER TABLE ADD CONSTRAINT foreign keys", () => {
    const { model } = ok(
      `CREATE TABLE a (id uuid PRIMARY KEY);
       CREATE TABLE b (id uuid PRIMARY KEY, a_id uuid);
       ALTER TABLE b ADD CONSTRAINT b_a_fk FOREIGN KEY (a_id) REFERENCES a (id);`,
    );
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].toTable).toBe("a");
  });

  it("applies ALTER TABLE ADD CONSTRAINT primary keys", () => {
    const { model } = ok(
      `CREATE TABLE t (id uuid);
       ALTER TABLE t ADD CONSTRAINT t_pk PRIMARY KEY (id);`,
    );
    const id = model.tables[0].columns.find((c) => c.name === "id");
    expect(id?.pk).toBe(true);
  });

  it("infers 1:1 when the FK column is UNIQUE", () => {
    const { model } = ok(
      `CREATE TABLE a (id uuid PRIMARY KEY);
       CREATE TABLE b (a_id uuid UNIQUE REFERENCES a (id));`,
    );
    expect(model.relations[0].cardinality).toBe("one-to-one");
  });

  it("marks a nullable FK as optional participation (crow's-foot)", () => {
    const { model } = ok(
      `CREATE TABLE a (id uuid PRIMARY KEY);
       CREATE TABLE b (a_id uuid REFERENCES a (id));`,
    );
    expect(model.relations[0].optional).toBe(true);
  });

  it("marks a NOT NULL FK as mandatory participation", () => {
    const { model } = ok(
      `CREATE TABLE a (id uuid PRIMARY KEY);
       CREATE TABLE b (a_id uuid NOT NULL REFERENCES a (id));`,
    );
    expect(model.relations[0].optional).toBe(false);
  });

  it("captures ON DELETE on a foreign key", () => {
    const { model } = ok(
      `CREATE TABLE a (id uuid PRIMARY KEY);
       CREATE TABLE b (a_id uuid REFERENCES a (id) ON DELETE CASCADE);`,
    );
    expect(model.relations[0].onDelete).toBe("cascade");
  });

  it("captures a column CHECK expression", () => {
    const { model } = ok(`CREATE TABLE t (age int CHECK (age > 0));`);
    const age = model.tables[0].columns.find((c) => c.name === "age");
    expect(age?.check).toContain("age");
  });

  it("attaches enum values to a column of an enum type", () => {
    const { model } = ok(
      `CREATE TYPE mood AS ENUM ('happy', 'sad');
       CREATE TABLE t (m mood);`,
    );
    const m = model.tables[0].columns.find((c) => c.name === "m");
    expect(m?.enumValues).toEqual(["happy", "sad"]);
  });

  it("matches enum values for a quoted / mixed-case enum type", () => {
    const { model } = ok(
      `CREATE TYPE "UserRole" AS ENUM ('admin', 'user');
       CREATE TABLE u (role "UserRole");`,
    );
    const role = model.tables[0].columns.find((c) => c.name === "role");
    expect(role?.enumValues).toEqual(["admin", "user"]);
  });

  it("annotates a column as FK even when the target table is absent (dangling)", () => {
    const { model } = ok(
      `CREATE TABLE c (id int PRIMARY KEY, oid int REFERENCES orgs (id) ON DELETE CASCADE);`,
    );
    const oid = model.tables[0].columns.find((c) => c.name === "oid");
    expect(oid?.fk).toBe(true);
    expect(oid?.fkTarget?.table).toBe("orgs");
    expect(oid?.fkTarget?.onDelete).toBe("cascade");
    expect(model.relations).toHaveLength(0); // no edge to a missing table
  });

  it("attaches COMMENT ON TABLE and COLUMN", () => {
    const { model } = ok(
      `CREATE TABLE t (id uuid PRIMARY KEY);
       COMMENT ON TABLE t IS 'my table';
       COMMENT ON COLUMN t.id IS 'the id';`,
    );
    expect(model.tables[0].comment).toBe("my table");
    expect(model.tables[0].columns[0].comment).toBe("the id");
  });

  it("captures CREATE INDEX onto the table", () => {
    const { model } = ok(
      `CREATE TABLE t (id uuid PRIMARY KEY, email text);
       CREATE INDEX t_email_idx ON t (email);`,
    );
    expect(model.tables[0].indexes?.some((i) => i.columns.includes("email"))).toBe(true);
  });

  it("surfaces a composite UNIQUE constraint as an index", () => {
    const { model } = ok(
      `CREATE TABLE t (a int, b int, UNIQUE (a, b));`,
    );
    expect(model.tables[0].indexes?.some((i) => i.unique && i.columns.length === 2)).toBe(
      true,
    );
  });

  it("handles a self-referencing FK", () => {
    const { model } = ok(
      `CREATE TABLE node (id uuid PRIMARY KEY, parent_id uuid REFERENCES node (id));`,
    );
    expect(model.relations).toHaveLength(1);
    expect(model.relations[0].fromTable).toBe("node");
    expect(model.relations[0].toTable).toBe("node");
  });

  it("keeps schema and quoted table names", () => {
    const { model } = ok(`CREATE TABLE app."User" (id uuid PRIMARY KEY);`);
    expect(model.tables[0].name).toBe("User");
    expect(model.tables[0].schema).toBe("app");
  });

  it("drops a dangling FK to a missing table and warns", () => {
    const r = ok(`CREATE TABLE b (a_id uuid REFERENCES missing (id));`);
    expect(r.model.relations).toHaveLength(0);
    expect(r.warning).toBeTruthy();
  });

  it("ignores non-table statements and notes the count", () => {
    const r = ok(
      `CREATE TABLE t (id uuid PRIMARY KEY); INSERT INTO t (id) VALUES ('x');`,
    );
    expect(r.model.tables).toHaveLength(1);
    expect(r.warning).toBeTruthy();
  });

  it("recovers the valid tables when one statement is broken (best-effort)", () => {
    const r = parseSql(
      `CREATE TABLE good (id uuid PRIMARY KEY); CREATE TABLE (this is broken;`,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.model.tables.length).toBeGreaterThanOrEqual(1);
  });

  it("returns an empty model for blank input", () => {
    const { model } = ok("   ");
    expect(model.tables).toHaveLength(0);
    expect(model.relations).toHaveLength(0);
  });
});
